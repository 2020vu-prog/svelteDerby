#!/bin/bash
function die {
	echo "error: $*"
	exit 1
}
[[ -z "$BucketName" ]] && die "Missing BucketName"
echo syncing to bucket: $BucketName

pwd
aws s3 sync ./s3ChartData  s3://$BucketName/data/brackets
