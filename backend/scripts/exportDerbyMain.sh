#!/bin/bash
set -x
TABLE='DerbyMain'
maxItems=25
index=0
DATA=$(aws dynamodb scan --table-name $TABLE --max-items $maxItems)
((index+=1))
echo $DATA | cat > "$TABLE-$index.json"

nextToken=$(echo $DATA | jq '.NextToken')
while [[ "${nextToken}" != "null" ]]
do
  DATA=$(aws dynamodb scan --table-name $TABLE --max-items $maxItems --starting-token $nextToken)
  ((index+=1))
  echo $DATA | cat > "$TABLE-$index.json"
  nextToken=$(echo $DATA | jq '.NextToken')
done
