#!/bin/bash

function getDeployParameter {
	if [[ -z "${TF_VAR_DeployEnvironment}" ]]; then
		return 1
	fi

	aws ssm get-parameter \
		--name "/deploy/${TF_VAR_DeployEnvironment}/frontend/$1" \
		--query "Parameter.Value" \
		--output text
}

if [[ -z "${DERBY_SPA_S3_BUCKET}" ]]; then
	DERBY_SPA_S3_BUCKET=$(getDeployParameter s3-bucket || true)
fi

if [[ -z "${DERBY_CLOUDFRONT}" ]]; then
	DERBY_CLOUDFRONT=$(getDeployParameter cloudfront-url || true)
fi

export DERBY_SPA_S3_BUCKET
export DERBY_CLOUDFRONT

if [[ -z "${DERBY_SPA_S3_BUCKET}" || -z "${DERBY_CLOUDFRONT}" ]]; then
	echo "missing frontend deploy config: set DERBY_SPA_S3_BUCKET and DERBY_CLOUDFRONT, or set TF_VAR_DeployEnvironment with matching SSM parameters"
	return 9 2>/dev/null || exit 9
fi
