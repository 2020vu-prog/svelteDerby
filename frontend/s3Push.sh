#!/bin/bash
set -e

function getDeployParameter {
	if [[ -z "${TF_VAR_DeployEnvironment}" ]]; then
		return 1
	fi

	aws ssm get-parameter \
		--name "/deploy/${TF_VAR_DeployEnvironment}/frontend/$1" \
		--query "Parameter.Value" \
		--output text
}

bucket=${DERBY_SPA_S3_BUCKET}
if [[ -z "${bucket}" ]]; then
	bucket=$(getDeployParameter s3-bucket || true)
fi

cloudfront=${DERBY_CLOUDFRONT}
if [[ -z "${cloudfront}" ]]; then
	cloudfront=$(getDeployParameter cloudfront-url || true)
fi

if [[ -z "${bucket}" || -z "${cloudfront}" ]]; then
	echo "missing frontend deploy config: set DERBY_SPA_S3_BUCKET and DERBY_CLOUDFRONT, or set TF_VAR_DeployEnvironment with matching SSM parameters"
	exit 9
fi

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
