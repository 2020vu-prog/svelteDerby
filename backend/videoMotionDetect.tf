# Prototype: detects when a car first appears in an uploaded video clip
# (see docs/VideoCarAppearanceDetectionProposal.md). Deployed as a standalone
# Lambda Function URL -- deliberately not wired into cloudfront.tf or
# derbyMain.js -- so this can be built out and iterated on without touching
# the existing request path. Reads/writes tags on the same S3 objects
# derbyMain already serves via /listMediaPrefix (aws_s3_bucket.dstBucket,
# defined in dynamo.tf), so no new bucket is needed.

locals {
  videoMotionDetectZip = "${path.module}/modules/videoMotionDetect/src/package.zip"
}

data "aws_iam_policy_document" "video_motion_detect_assume_role" {
  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "video_motion_detect" {
  name_prefix          = "video_motion_detect_"
  permissions_boundary = var.ManagedRolePermissionsBoundaryArn
  assume_role_policy   = data.aws_iam_policy_document.video_motion_detect_assume_role.json
}

data "aws_iam_policy_document" "video_motion_detect_permissions" {
  statement {
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["arn:aws:logs:*:*:*"]
  }
  statement {
    actions = [
      "s3:GetObject",
      "s3:GetObjectTagging",
      "s3:PutObjectTagging",
    ]
    resources = [
      "${aws_s3_bucket.dstBucket.arn}/media/*",
    ]
  }
}

resource "aws_iam_role_policy" "video_motion_detect" {
  name   = "video_motion_detect"
  role   = aws_iam_role.video_motion_detect.id
  policy = data.aws_iam_policy_document.video_motion_detect_permissions.json
}

resource "aws_cloudwatch_log_group" "video_motion_detect" {
  name              = "/aws/lambda/videoMotionDetect"
  retention_in_days = 7
}

resource "aws_lambda_function" "video_motion_detect" {
  function_name = "videoMotionDetect"

  filename         = local.videoMotionDetectZip
  source_code_hash = filebase64sha256(local.videoMotionDetectZip)

  role        = aws_iam_role.video_motion_detect.arn
  handler     = "motionDetect.handler"
  runtime     = "python3.13"
  timeout     = 30
  memory_size = 1024

  environment {
    variables = {
      MediaBucket = aws_s3_bucket.dstBucket.id
    }
  }

  depends_on = [aws_cloudwatch_log_group.video_motion_detect]
}

resource "aws_lambda_function_url" "video_motion_detect" {
  function_name      = aws_lambda_function.video_motion_detect.function_name
  authorization_type = "NONE"
  cors {
    allow_credentials = false
    allow_origins     = ["*"]
    allow_methods     = ["GET"]
    allow_headers     = ["date", "keep-alive"]
    expose_headers    = ["keep-alive", "date"]
    max_age           = 86400
  }
}

output "video_motion_detect_url" {
  value = aws_lambda_function_url.video_motion_detect.function_url
}
