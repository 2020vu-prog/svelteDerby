# This boundary prevents the deploy role from turning a managed Lambda or Cognito
# role into an IAM principal with broader authority than the application needs.
data "aws_iam_policy_document" "managed_role_boundary" {
  statement {
    sid    = "AllowApplicationRuntimeActions"
    effect = "Allow"
    actions = [
      "cognito-identity:*",
      "cognito-sync:*",
      "dynamodb:BatchGetItem",
      "dynamodb:BatchWriteItem",
      "dynamodb:DescribeStream",
      "dynamodb:GetItem",
      "dynamodb:GetRecords",
      "dynamodb:GetShardIterator",
      "dynamodb:ListStreams",
      "dynamodb:PutItem",
      "dynamodb:Query",
      "dynamodb:UpdateItem",
      "ec2:RunInstances",
      "iot:AttachPrincipalPolicy",
      "iot:Connect",
      "iot:Publish",
      "iot:Receive",
      "iot:Subscribe",
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "mobileanalytics:PutEvents",
      "polly:StartSpeechSynthesisTask",
      "polly:SynthesizeSpeech",
      "s3:GetObject",
      "s3:GetObjectTagging",
      "s3:ListBucket",
      "s3:ListObjects",
      "s3:PutObject",
      "s3:PutObjectAcl",
      "s3:PutObjectTagging",
      "sns:Publish",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
      "sqs:ReceiveMessage",
      "sqs:SendMessage",
      "ssm:GetParameter",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "managed_role_boundary" {
  count = var.create_managed_role_permissions_boundary ? 1 : 0

  name        = var.managed_role_permissions_boundary_name
  description = "Maximum permissions for IAM roles created by svelteDerby Terraform."
  policy      = data.aws_iam_policy_document.managed_role_boundary.json
}
