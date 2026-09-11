"""
Local, S3-free harness for the motionDetect algorithm: runs _probe_fps,
frame extraction, and _find_motion_onset directly against a local video
file, bypassing the S3 download/tagging in handler(). Not part of the
deployed package -- for manual verification only.

Usage: python3 test_local.py <video_path> [<video_path> ...]
"""

import os
import sys
import subprocess
import tempfile

sys.path.insert(0, os.path.dirname(__file__))
import motionDetect as md  # noqa: E402


def run(video_path):
    fps = md._probe_fps(video_path)
    if fps is None:
        return {"status": "decode_error", "reason": "fps probe failed"}

    with tempfile.TemporaryDirectory() as tmpdir:
        frame_pattern = os.path.join(tmpdir, "f_%04d.png")
        try:
            subprocess.run(
                [
                    md.FFMPEG_BIN,
                    "-y",
                    "-loglevel",
                    "error",
                    "-i",
                    video_path,
                    frame_pattern,
                ],
                check=True,
                timeout=md.FFMPEG_TIMEOUT_SECONDS,
                capture_output=True,
            )
        except subprocess.CalledProcessError as err:
            return {
                "status": "decode_error",
                "reason": err.stderr.decode(errors="replace"),
            }
        except subprocess.TimeoutExpired:
            return {"status": "decode_error", "reason": "ffmpeg timeout"}

        frame_files = sorted(
            os.path.join(tmpdir, f) for f in os.listdir(tmpdir)
        )
        if len(frame_files) < 2:
            return {"status": "decode_error", "reason": "too few frames"}

        onset_frame_index = md._find_motion_onset(frame_files)
        if onset_frame_index is None:
            return {"status": "no_motion", "fps": fps, "frames": len(frame_files)}

        offset_ms = round((onset_frame_index / fps) * 1000)
        return {
            "status": "found",
            "offsetMs": offset_ms,
            "fps": fps,
            "onsetFrame": onset_frame_index,
            "frames": len(frame_files),
        }


if __name__ == "__main__":
    for path in sys.argv[1:]:
        print(f"{path}: {run(path)}")
