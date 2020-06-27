source ./generatedTargets.sh
bucket=$DERBY_SPA_S3_BUCKET
aws s3 sync $QUIET  \
	--cache-control 'no-cache' \
	--exclude bundle.*.js \
	--exclude vendors.*.js \
	./public/ s3://$bucket

echo now sync remaining...
aws s3 sync $QUIET   \
	--cache-control 'max-age=604800' \
	./public/ s3://$bucket
echo cloudfront endpoint: $DERBY_CLOUDFRONT

