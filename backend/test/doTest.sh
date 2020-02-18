#export CF="https://05wv6js1p4.execute-api.us-east-2.amazonaws.com/test"
export CF="https://d15zun4udup4ky.cloudfront.net/app"
#time curl $VERBOSE $CF/addBulk         -XPOST --data @bulk.json
time curl $VERBOSE $CF/addParticipant -XPOST --data @driver.json
time curl $VERBOSE $CF/addParticipant -XPOST --data @driver.json
time curl $VERBOSE $CF/addPending     -XPOST --data @pending.json

time curl $VERBOSE $CF/ddbQuery       -XPOST --data @ddbQuery.json
time curl $VERBOSE $CF/getRaceConfig
