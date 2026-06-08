#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <tableName> <PK>" >&2
  exit 2
}

[[ $# -eq 2 ]] || usage

tableName=$1
pk=$2

command -v aws >/dev/null 2>&1 || {
  echo "Error: aws CLI is required" >&2
  exit 1
}

command -v jq >/dev/null 2>&1 || {
  echo "Error: jq is required" >&2
  exit 1
}

expressionValues=$(mktemp)
trap 'rm -f "$expressionValues"' EXIT

jq -n --arg pk "$pk" '{":pk": {"S": $pk}}' > "$expressionValues"

aws dynamodb query \
  --table-name "$tableName" \
  --key-condition-expression '#pk = :pk' \
  --expression-attribute-names '{"#pk":"PK"}' \
  --expression-attribute-values "file://$expressionValues" \
  --output json \
| jq -c '
  def from_ddb:
    if type != "object" then
      .
    elif has("S") then
      .S
    elif has("N") then
      (.N | tonumber? // .)
    elif has("BOOL") then
      .BOOL
    elif has("NULL") then
      null
    elif has("M") then
      .M | with_entries(.value |= from_ddb)
    elif has("L") then
      .L | map(from_ddb)
    elif has("SS") then
      .SS
    elif has("NS") then
      .NS | map(tonumber? // .)
    elif has("BS") then
      .BS
    else
      with_entries(.value |= from_ddb)
    end;

  .Items[] | with_entries(.value |= from_ddb)
'
