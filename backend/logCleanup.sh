set -x

#aws logs describe-log-streams --log-group-name $lgName --log-stream-name-prefix "2020" --query 'logStreams[*].logStreamName' --output table 
function doPurge {
aws logs describe-log-streams --log-group-name $lgName --log-stream-name-prefix "2020" --query 'logStreams[*].logStreamName' --output table | awk '{print $2}' | grep -v ^$ | while read x; do aws logs delete-log-stream --log-group-name $lgName --log-stream-name $x;done;
}

export AWS_DEFAULT_REGION=us-east-2
lgName=/aws/lambda/dynamoMain doPurge
lgName=/aws/lambda/derbyMain  doPurge
lgName=/aws/lambda/sqsCcaMain doPurge
lgName=/aws/lambda/timerIngestion-dev-getUuid      doPurge
lgName=/aws/lambda/timerIngestion-dev-ingestTimes  doPurge
lgName=/aws/lambda/vod-transcode-stack-convert     doPurge
