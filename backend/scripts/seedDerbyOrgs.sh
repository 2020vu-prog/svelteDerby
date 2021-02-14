#!/bin/bash
set -e 

[[ -z $TableName ]] && exit 9
jsonItemFile=$(mktemp)
cat << JSON > $jsonItemFile
{
  "defaultTTL": {
    "N": "86400"
  },
  "PK": {
    "S": "OrgConfig"
  },
  "SK": {
    "S": "Test"
  }
}
JSON
echo "loading $jsonItemFile into $TableName"
aws dynamodb put-item \
    --region "$TF_VAR_AwsRegion" \
    --table-name "$TableName" \
    --item file://$jsonItemFile \
    --return-consumed-capacity TOTAL \
    --return-item-collection-metrics SIZE

rm $jsonItemFile
