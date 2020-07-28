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

data "aws_iam_policy_document" "android_put_document" {
  statement {
    actions   = [
	"s3:PutObject"
	]
    resources = [
	"${aws_s3_bucket.dstBucket.arn}/media/*"
    ]

  }
}

resource "aws_iam_user_policy" "android_put" {
  name = "test"
  user = aws_iam_user.android.name

  policy = data.aws_iam_policy_document.android_put_document.json
}




resource "aws_iot_policy" "grafikaSubToAnyTopic" {
  name = "GrafikaSubToAnyTopic"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "iot:Subscribe",
        "iot:Connect",
        "iot:Receive"
      ],
      "Effect": "Allow",
      "Resource": "*"
    }
  ]
}
EOF
}

resource "aws_iot_certificate" "grafika_cert" {
  active = true
}

resource "aws_iot_policy_attachment" "att" {
  policy = aws_iot_policy.grafikaSubToAnyTopic.name
  target = aws_iot_certificate.grafika_cert.arn
}
