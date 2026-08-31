"""
Lambda Function URL handler for the video car-appearance motion-detect
prototype (see docs/VideoCarAppearanceDetectionProposal.md).

GET ?key=<S3 key of an uploaded clip under media/> ->
    {"status": "found", "offsetMs": <int>}       -- sustained motion onset found
    {"status": "no_motion"}                       -- decoded fine, no onset found
    {"status": "decode_error"}                    -- ffmpeg/ffprobe couldn't process it
    {"status": "not_found"}                       -- key doesn't exist in the bucket

Idempotent: the result is stored as S3 object tags on the clip itself, and a
second call for the same key returns the stored tags instead of
reprocessing. This also makes the same endpoint usable to (re-)run detection
against archived clips for further validation, not just newly uploaded ones.
"""

import json
import os
import re
import subprocess
import tempfile

import boto3
from PIL import Image, ImageChops

s3 = boto3.client("s3")

BUCKET = os.environ["MediaBucket"]
BIN_DIR = os.path.join(os.path.dirname(__file__), "bin")
FFMPEG_BIN = os.path.join(BIN_DIR, "ffmpeg")
FFPROBE_BIN = os.path.join(BIN_DIR, "ffprobe")

# Same constants as the validated prototype (prototype_frame_detect.py) --
# see the proposal doc's "Broader validation" section for how these were
# chosen against real archived footage.
PIXEL_DIFF_THRESHOLD = 40
SAMPLE_STRIDE = 2
NOISE_FLOOR_MULTIPLIER = 8
MIN_ABSOLUTE_PIXELS = 30
CONSECUTIVE_FRAMES_REQUIRED = 2

FFMPEG_TIMEOUT_SECONDS = 25
FFPROBE_TIMEOUT_SECONDS = 10

STATUS_TAG = "motionStatus"
OFFSET_TAG = "motionOffsetMs"
VERSION_TAG = "motionAlgorithmVersion"
VALID_STATUSES = {"found", "no_motion", "decode_error", "not_found"}

# Bump whenever a change could produce a different result for the same clip
# (e.g. _find_motion_onset's logic, the tuning constants above, or which
# file actually gets analyzed) -- not for unrelated changes like response
# headers. A cached tag written under an older (or missing/unversioned)
# algorithm version is treated as stale and reprocessed; see
# _read_existing_result. 2 reflects the "pick the highest-peak run, not the
# first" fix (results tagged by the original first-run-wins logic, which
# never wrote this tag at all, are version 0); 3 reflects preferring the
# transcoded .mp4 over a .webm request (see _prefer_transcoded_key).
ALGORITHM_VERSION = 3


def _tag_version(tags):
    try:
        return int(tags.get(VERSION_TAG, "0"))
    except (TypeError, ValueError):
        return 0


def handler(event, context):
    key = ((event or {}).get("queryStringParameters") or {}).get("key")
    if not key:
        return _response(400, {"error": "Missing required query parameter: key"})

    existing = _read_existing_result(key)
    if existing is not None:
        return _response(200, existing)

    result = _detect(key)
    if result["status"] != "not_found":
        # A nonexistent object can't hold tags -- put_object_tagging on a
        # missing key is rejected by S3, so there's nothing to cache here.
        # A not_found key just gets re-checked (and re-fails the same way)
        # on every request instead of being remembered.
        _write_result(key, result)
    return _response(200, result)


def _read_existing_result(key):
    """Returns the previously-stored result for key, or None if this key
    hasn't been processed yet, or was tagged by an older algorithm version
    and needs to be recomputed."""
    try:
        tagging = s3.get_object_tagging(Bucket=BUCKET, Key=key)
    except s3.exceptions.ClientError:
        # Object itself may not exist (a `not_found` result was never
        # written for it because it never got that far) -- fall through to
        # re-run detection, which will produce and persist that result.
        return None
    tags = {t["Key"]: t["Value"] for t in tagging.get("TagSet", [])}
    status = tags.get(STATUS_TAG)
    if status not in VALID_STATUSES:
        return None
    if _tag_version(tags) < ALGORITHM_VERSION:
        return None
    result = {"status": status}
    if status == "found" and OFFSET_TAG in tags:
        result["offsetMs"] = int(tags[OFFSET_TAG])
    return result


def _write_result(key, result):
    # S3 PutObjectTagging replaces the whole tag set, not a merge -- fetch
    # and merge so this doesn't clobber unrelated tags something else may
    # have set on the object.
    try:
        existing_tags = s3.get_object_tagging(Bucket=BUCKET, Key=key).get(
            "TagSet", []
        )
    except s3.exceptions.ClientError:
        existing_tags = []
    merged = {t["Key"]: t["Value"] for t in existing_tags}
    merged[STATUS_TAG] = result["status"]
    merged[VERSION_TAG] = str(ALGORITHM_VERSION)
    if "offsetMs" in result:
        merged[OFFSET_TAG] = str(result["offsetMs"])
    else:
        merged.pop(OFFSET_TAG, None)
    s3.put_object_tagging(
        Bucket=BUCKET,
        Key=key,
        Tagging={"TagSet": [{"Key": k, "Value": v} for k, v in merged.items()]},
    )


def _prefer_transcoded_key(key):
    """A raw .webm capture's actual frame rate can drift from its declared
    nominal rate (browser MediaRecorder output is often variable-frame-rate).
    Extracting frames at a fixed rate from that then duplicates frames to
    fill the gaps, which can break the consecutive-frame motion check even
    during large, real motion. The MediaConvert-transcoded .mp4 counterpart
    is re-encoded at a clean, constant frame rate (and is also smaller, with
    fewer frames to process) -- prefer it when a .webm key is requested.
    """
    if key.lower().endswith(".webm"):
        return key[: -len(".webm")] + ".mp4"
    return key


def _download(key, dest_path):
    try:
        s3.download_file(BUCKET, key, dest_path)
        return True
    except Exception:
        return False


def _detect(key):
    with tempfile.TemporaryDirectory() as tmpdir:
        video_path = os.path.join(tmpdir, "clip")
        preferred_key = _prefer_transcoded_key(key)
        if not _download(preferred_key, video_path):
            # Transcoded .mp4 isn't available yet (or this key has no .mp4
            # counterpart) -- fall back to the originally-requested file
            # rather than failing outright, unless that's the same key we
            # already just tried.
            if preferred_key == key or not _download(key, video_path):
                return {"status": "not_found"}

        fps = _probe_fps(video_path)
        if fps is None:
            return {"status": "decode_error"}

        frames_dir = os.path.join(tmpdir, "frames")
        os.makedirs(frames_dir)
        frame_pattern = os.path.join(frames_dir, "f_%04d.png")
        try:
            subprocess.run(
                [
                    FFMPEG_BIN,
                    "-y",
                    "-loglevel",
                    "error",
                    "-i",
                    video_path,
                    frame_pattern,
                ],
                check=True,
                timeout=FFMPEG_TIMEOUT_SECONDS,
                capture_output=True,
            )
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
            return {"status": "decode_error"}

        frame_files = sorted(
            os.path.join(frames_dir, f) for f in os.listdir(frames_dir)
        )
        if len(frame_files) < 2:
            return {"status": "decode_error"}

        onset_frame_index = _find_motion_onset(frame_files)
        if onset_frame_index is None:
            return {"status": "no_motion"}

        offset_ms = round((onset_frame_index / fps) * 1000)
        return {"status": "found", "offsetMs": offset_ms}


def _probe_fps(video_path):
    try:
        proc = subprocess.run(
            [
                FFPROBE_BIN,
                "-v",
                "error",
                "-select_streams",
                "v:0",
                "-show_entries",
                "stream=r_frame_rate",
                "-of",
                "csv=p=0",
                video_path,
            ],
            capture_output=True,
            timeout=FFPROBE_TIMEOUT_SECONDS,
            text=True,
        )
    except subprocess.TimeoutExpired:
        return None
    if proc.returncode != 0:
        return None
    # r_frame_rate is a rational like "30000/1001" or "15/1", not a decimal.
    match = re.match(r"^\s*(\d+)/(\d+)\s*$", proc.stdout)
    if not match:
        return None
    numerator, denominator = int(match.group(1)), int(match.group(2))
    if denominator == 0:
        return None
    return numerator / denominator


def _changed_pixel_count(prev, frame):
    diff = ImageChops.difference(prev, frame)
    w, h = diff.size
    pixels = diff.load()
    return sum(
        1
        for y in range(0, h, SAMPLE_STRIDE)
        for x in range(0, w, SAMPLE_STRIDE)
        if pixels[x, y] > PIXEL_DIFF_THRESHOLD
    )


def _find_motion_onset(frame_files):
    """Returns the 0-based index into frame_files of the first frame of the
    clip's most prominent sustained motion run, or None if no run of at
    least CONSECUTIVE_FRAMES_REQUIRED frames clears the noise-floor
    threshold.

    counts[i] is the diff between frame_files[i] and frame_files[i + 1], so
    a run starting at counts index run_start reflects frame_files[run_start
    + 1] onward as the frames that actually show the change -- the onset
    frame is run_start + 1, not run_start.

    Picks the run with the highest peak changed-pixel count, not simply the
    first qualifying run chronologically: a clip can have an early, weaker
    burst (camera settling, compression noise, vibration in an edge-dense
    scene) well before the real, much stronger car-crossing signal later.
    Taking the first run alone reports the spurious one -- confirmed
    against two real archived clips where the true crossing's peak was
    5-10x the false run's peak.
    """
    counts = []
    prev = None
    for path in frame_files:
        frame = Image.open(path).convert("L")
        if prev is not None:
            counts.append(_changed_pixel_count(prev, frame))
        prev = frame

    if not counts:
        return None

    sorted_counts = sorted(counts)
    median_noise = sorted_counts[len(sorted_counts) // 2]
    threshold = max(MIN_ABSOLUTE_PIXELS, median_noise * NOISE_FLOOR_MULTIPLIER)

    # Every maximal run of consecutive frames at/above threshold that's at
    # least CONSECUTIVE_FRAMES_REQUIRED long, as (start_index, peak_count).
    runs = []
    run_start = None
    for i, count in enumerate(counts):
        if count >= threshold:
            if run_start is None:
                run_start = i
        else:
            if run_start is not None and i - run_start >= CONSECUTIVE_FRAMES_REQUIRED:
                runs.append((run_start, max(counts[run_start:i])))
            run_start = None
    if run_start is not None and len(counts) - run_start >= CONSECUTIVE_FRAMES_REQUIRED:
        runs.append((run_start, max(counts[run_start:])))

    if not runs:
        return None

    best_start, _ = max(runs, key=lambda run: run[1])
    return best_start + 1


def _response(status_code, body):
    # No Access-Control-Allow-Origin here: the Lambda Function URL's own
    # CORS config (the `cors` block on aws_lambda_function_url in
    # videoMotionDetect.tf) already adds it to every response. Adding it
    # again here duplicates the header into "*, *", which browsers reject
    # as an invalid CORS response.
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
        },
        "body": json.dumps(body),
    }
