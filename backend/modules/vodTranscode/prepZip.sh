pushd src
	zip -r lambda.zip convert.py job.json
popd
#aws s3 cp src/lambda.zip s3://www.rr1.us/vodTranscode/lambda.zip
#aws s3 cp s3://www.rr1.us/vodTranscode/lambda.zip s3://ohio.rr1.us/vodTranscode/lambda.zip
