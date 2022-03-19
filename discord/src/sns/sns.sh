#!/bin/bash
export DeployEnvironment=dev
export AWS_DEFAULT_REGION=us-east-2
topicArn=$(aws ssm get-parameters --names   "/${DeployEnvironment}/discord-bot/sns-topic" |jq -r '.Parameters[0].Value')
echo $topicArn
./cjwsns --sns $topicArn
