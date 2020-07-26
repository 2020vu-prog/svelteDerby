resource "aws_iam_user" "android" {
  name = "android-MqGrafika-Baked-In-User"
  path = "/system/"

  tags = {
    terraform= "s3VideoUser.tf"
  }
}

locals {
	dstBucketArn=aws_s3_bucket.dstBucket.arn
	dstBucketArnMedia="${aws_s3_bucket.dstBucket.arn}/media/*"
}

resource "aws_iam_access_key" "android" {
  user = aws_iam_user.android.name
}

resource "aws_iam_user_policy" "android_put" {
  name = "test"
  user = aws_iam_user.android.name

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
	"s3:PutObject"

      ],
      "Effect": "Allow",
      "Resource": "arn:aws:s3:::derby-dst-bucket20200627220032157000000004/media/*"
    }
  ]
}
EOF
}
