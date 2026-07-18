#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  publishTapThreshold.sh <timer-or-topic> <threshold> [region]

Examples:
  publishTapThreshold.sh RR1-E21BFC 1
  publishTapThreshold.sh rr2Timer/RR1-E21BFC/cli 32 us-east-2

Publishes this CLI command to AWS IoT MQTT:
  {"cmd":"tap_threshold","value":<threshold>}
USAGE
}

if [[ $# -lt 2 || $# -gt 3 ]]; then
  usage >&2
  exit 2
fi

timer_or_topic="$1"
threshold="$2"
region="${3:-${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-2}}}"

if ! [[ "$threshold" =~ ^[0-9]+$ ]]; then
  echo "threshold must be an integer from 0 to 127" >&2
  exit 2
fi

if (( threshold < 0 || threshold > 127 )); then
  echo "threshold must be an integer from 0 to 127" >&2
  exit 2
fi

if [[ "$timer_or_topic" == rr2Timer/* ]]; then
  topic="$timer_or_topic"
else
  topic="rr2Timer/${timer_or_topic}/cli"
fi

payload=$(printf '{"cmd":"tap_threshold","value":%d}' "$threshold")
endpoint=$(aws iot describe-endpoint \
  --endpoint-type iot:Data-ATS \
  --region "$region" \
  --query endpointAddress \
  --output text)

echo "Publishing tap threshold to topic: $topic"
echo "Payload: $payload"

aws iot-data publish \
  --endpoint-url "https://${endpoint}" \
  --region "$region" \
  --topic "$topic" \
  --qos 1 \
  --cli-binary-format raw-in-base64-out \
  --payload "$payload"
