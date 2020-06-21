uuid=$(uuidgen)
JSON='{"PK":"UUID","dataList":[12]}' 
JSON=$(sed "s/UUID/$uuid/g" <<< $JSON)
echo $JSON >&2
curl -H "Content-Type: application/json" -X POST -d "$JSON" https://cfxgbxl7d9.execute-api.us-east-2.amazonaws.com/dev/timer/ingestTimes
