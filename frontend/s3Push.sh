#!/bin/bash
set -e

if [[ -z "${TF_VAR_DeployEnvironment}" ]]; then
	echo "missing env for TF_VAR_DeployEnvironment"
	exit 9
fi

function getDeployParameter {
	aws ssm get-parameter \
		--name "/deploy/${TF_VAR_DeployEnvironment}/frontend/$1" \
		--query "Parameter.Value" \
		--output text
}

bucket=${DERBY_SPA_S3_BUCKET:-$(getDeployParameter s3-bucket)}
cloudfront=${DERBY_CLOUDFRONT:-$(getDeployParameter cloudfront-url)}

echo "###"
echo "### push no-cache"
echo "###"
aws s3 sync $QUIET  \
	--cache-control 'no-cache' \
	--exclude *.*.css \
	--exclude global*.css \
	--exclude bundle.*.js \
	--exclude vendors.*.js \
	--exclude *.svg \
	--exclude *.mp3 \
	--exclude favicon.png \
	./public/ s3://$bucket

echo now sync remaining...
echo "###"
echo "### push cache 604800"
echo "###"
aws s3 sync $QUIET   \
	--cache-control 'max-age=604800' \
	./public/ s3://$bucket
echo cloudfront endpoint: $cloudfront
