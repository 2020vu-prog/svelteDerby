#!/bin/bash
function s3PushOLD {
	source "./generatedTargets-${TF_VAR_DeployEnvironment}.sh"
	#source ./generatedTargets.sh
	bucket=$DERBY_SPA_S3_BUCKET
	echo "########"
	echo "######## Begin no-cache"
	echo "########"
	aws s3 sync $QUIET  \
		--cache-control 'no-cache' \
		--exclude bundle.*.js \
		--exclude vendors.*.js \
		./public/ s3://$bucket

	echo now sync remaining...
	echo "########"
	echo "######## Begin cache 604800"
	echo "########"
	aws s3 sync $QUIET   \
		--cache-control 'max-age=604800' \
		./public/ s3://$bucket
	echo cloudfront endpoint: $DERBY_CLOUDFRONT
}

export NODE_OPTIONS=--openssl-legacy-provider
make install &&  npm run build && ./s3Push.sh
