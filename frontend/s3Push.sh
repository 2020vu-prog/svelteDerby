source ./generatedTargets.sh
bucket=$DERBY_SPA_S3_BUCKET
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
echo cloudfront endpoint: $DERBY_CLOUDFRONT

