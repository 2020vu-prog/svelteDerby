#!/bin/bash
##CF="https://d15zun4udup4ky.cloudfront.net/app"
source ../../frontend/generatedTargets.sh
CF=${DERBY_CLOUDFRONT}/app
time curl $VERBOSE $CF/addParticipant -XPOST --data @driver.json
#time curl $VERBOSE  "${CF}/getRaceHistory?orgId=chi&hiMicros=$foo5" --compress
