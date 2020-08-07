aws s3 cp index.html s3://www.rr1.us/index.html
aws s3api put-object-acl --bucket www.rr1.us --key index.html --acl public-read

