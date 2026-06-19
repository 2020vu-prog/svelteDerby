token=$(cat token.txt)
curl 'https://cf.derby.rr1.us/app/addBulk' \
  -H 'authority: cf.derby.rr1.us' \
  -H 'accept: application/json, text/plain, */*' \
  -H "authorization: $token" \
  -H 'content-type: application/json;charset=UTF-8' \
  -H 'origin: https://cf.derby.rr1.us' \
  --data-binary @drivers.json \
  --compressed
