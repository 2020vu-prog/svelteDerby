#!/bin/bash
set -x
export now=$(date '+%s')
(( ttl= now + (3600*24*7) ))
export ttl
echo $now
echo $ttl
export timer="DEV001"
if [[ -n "$1" ]]
then
	timer=$1
fi

aws dynamodb put-item --table-name timer-protobuf --item "$(cat << EOF
{
  "PK":
    {
      "S": "DiscoverTimerOverride"
    },
  "SK":
    {
      "S": "$timer"
    },
  "pri":
    {
      "N": "$now"
    },
  "TTL":
    {
      "N": "$ttl"
    } 
}
EOF
)"
