curl --verbose  https://05wv6js1p4.execute-api.us-east-2.amazonaws.com/test/addParticipant -XPOST --data @driver.json
curl --verbose  https://05wv6js1p4.execute-api.us-east-2.amazonaws.com/test/addPending     -XPOST --data @pending.json
curl --verbose  https://05wv6js1p4.execute-api.us-east-2.amazonaws.com/test/ddbQuery       -XPOST --data @ddbQuery.json
