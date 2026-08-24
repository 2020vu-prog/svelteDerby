"""Direct S3-to-Lambda video conversion pilot.

Objects uploaded below ``ffmpeg-inputs/`` are converted locally by the
LGPL-configured FFmpeg executable that is packaged with this Lambda.  The
existing ``inputs/`` prefix continues to use MediaConvert.
"""

import logging
import os
import subprocess
from pathlib import Path
from urllib.parse import unquote_plus

import boto3

LOGGER = logging.getLogger()
LOGGER.setLevel(logging.INFO)
S3 = boto3.client("s3")
INPUT_PREFIX = "ffmpeg-inputs/"
OUTPUT_PREFIX = "ffmpeg/"
FFMPEG_PATH = Path(__file__).parent / "bin" / "ffmpeg"


def output_key(input_key):
    """Return the destination key while preserving paths below the pilot prefix."""
    if not input_key.startswith(INPUT_PREFIX):
        raise ValueError(f"Unexpected direct-transcode key: {input_key}")
    return f"{OUTPUT_PREFIX}{input_key.removeprefix(INPUT_PREFIX).rsplit('.', 1)[0]}.mp4"


def convert_record(record):
    """Download, transcode, and upload the video referenced by one S3 event record."""
    bucket = record["s3"]["bucket"]["name"]
    input_key = unquote_plus(record["s3"]["object"]["key"])
    destination_bucket = os.environ["DestinationBucket"]
    destination_key = output_key(input_key)
    local_input = Path("/tmp/input")
    local_output = Path("/tmp/output.mp4")

    local_input.unlink(missing_ok=True)
    local_output.unlink(missing_ok=True)
    S3.download_file(bucket, input_key, str(local_input))

    command = [
        str(FFMPEG_PATH),
        "-nostdin",
        "-y",
        "-i",
        str(local_input),
        "-c:v",
        "mpeg4",
        "-q:v",
        "5",
        "-c:a",
        "aac",
        "-movflags",
        "+faststart",
        str(local_output),
    ]
    result = subprocess.run(command, check=True, capture_output=True, text=True)
    LOGGER.info("FFmpeg completed for %s: %s", input_key, result.stderr[-1000:])
    S3.upload_file(str(local_output), destination_bucket, destination_key)
    LOGGER.info("Converted s3://%s/%s to s3://%s/%s", bucket, input_key, destination_bucket, destination_key)


def handler(event, _context):
    """Process all records in an asynchronous S3 notification."""
    for record in event["Records"]:
        convert_record(record)
