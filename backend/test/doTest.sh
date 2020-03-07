set -x
#export CF="https://05wv6js1p4.execute-api.us-east-2.amazonaws.com/test"
export CF="https://d15zun4udup4ky.cloudfront.net/app"
export token=$(cat token.txt)
AUTH="Authorization: $token"

time curl   $VERBOSE $CF/addEventConfig  -XPOST --data @eventConfig.json --header "$AUTH"
time curl   $VERBOSE $CF/addParticipant -XPOST --data @driver.json       --header "$AUTH"
time curl   $VERBOSE $CF/addParticipant -XPOST --data @driver.json       --header "$AUTH"
time curl   $VERBOSE $CF/addPending     -XPOST --data @pending.json       --header "$AUTH"
time curl   $VERBOSE $CF/addBlocks      -XPOST --data @blocks.json       --header "$AUTH"

time curl   $VERBOSE $CF/ddbQuery       -XPOST --data @ddbQuery.json       --header "$AUTH"
time curl  $VERBOSE $CF/addBulk         -XPOST --data @bulk.json        --header "$AUTH"
time curl   $VERBOSE $CF/getRaceConfig  --header "$AUTH"
time curl   $VERBOSE $CF/getRaceHistory?orgId=chi  --header "$AUTH"
