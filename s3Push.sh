aws s3 sync $QUIET  \
	--cache-control 'no-cache' \
	--exclude bundle.*.js \
	--exclude vendors.*.js \
	./public/ s3://svelte20200215161007200200000001

echo now sync remaining...
aws s3 sync $QUIET   \
	--cache-control 'max-age=604800' \
	./public/ s3://svelte20200215161007200200000001
echo https://d15zun4udup4ky.cloudfront.net

