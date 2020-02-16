CF="https://d15zun4udup4ky.cloudfront.net/app"
time curl $VERBOSE $CF/addParticipant -XPOST --data @driver.json
#time curl $VERBOSE  "${CF}/getRaceHistory?orgId=chi&hiMicros=$foo5" --compress
