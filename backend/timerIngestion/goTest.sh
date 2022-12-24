uuid=$(uuidgen)
JSON='{"PK":"UUID","dataList":[12]}' 
JSON=$(sed "s/UUID/$uuid/g" <<< $JSON)
echo $JSON >&2
T_URL=https://cfxgbxl7d9.execute-api.us-east-2.amazonaws.com/dev/timer/ingestTimes
T_URL=https://cf.derby.rr1.us/timer/ingestTimes
curl -H "Content-Type: application/json" -X POST -d "$JSON" $T_URL
