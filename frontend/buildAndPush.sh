#!/bin/bash
set -e

if [[ -z "${DERBY_SPA_S3_BUCKET}" || -z "${DERBY_CLOUDFRONT}" ]]; then
	echo "missing frontend deploy config: DERBY_SPA_S3_BUCKET and DERBY_CLOUDFRONT are required"
	exit 9
fi

export NODE_OPTIONS=--openssl-legacy-provider
make install &&  npm run build && ./s3Push.sh
