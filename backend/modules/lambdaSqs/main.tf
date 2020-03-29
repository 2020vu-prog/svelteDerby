
variable DeployEnvironment {}
variable DistDbArn {}
variable DynamoDbArn {}
variable S3DistBucket {}
variable S3DistBucketArn {}
variable AwsRegion {}
variable CcaQueueArn {}

provider "archive" {}
locals{
  tags = {
    Environment = var.DeployEnvironment
    CreatedBy = "terraform ${basename(path.cwd)}"
  }
      ddbList= split("/",var.DynamoDbArn)
      DynamoDbTable= element(local.ddbList,length(local.ddbList)-1)

      distDdbList= split("/",var.DistDbArn)
      DistDbTable= element(local.distDdbList,length(local.distDdbList)-1)
	accountId = data.aws_caller_identity.current.account_id
	IotArn="arn:aws:iot:${var.AwsRegion}:${local.accountId}"

      
}


data "aws_caller_identity" "current" {}


data "archive_file" "sqsCcaMain" {
  type        = "zip"
  source_dir = "${path.module}/src/"
  output_path = "tmp/build/sqsCcaMain.zip"
}

data "aws_iam_policy_document" "policy" {
  statement {
    sid    = ""
    effect = "Allow"

    principals {
      identifiers = [
         "lambda.amazonaws.com"
      ]
      type        = "Service"
    }

    actions = ["sts:AssumeRole" ]
  }
}



resource "aws_iam_role" "iam_for_lambda_cca" {
  name               = "iam_for_lambda_cca"
  assume_role_policy = data.aws_iam_policy_document.policy.json
  tags=local.tags
}

resource "aws_lambda_function" "lambda" {
  function_name = "sqsCcaMain"

  filename         = data.archive_file.sqsCcaMain.output_path
  source_code_hash = data.archive_file.sqsCcaMain.output_base64sha256

  role    = aws_iam_role.iam_for_lambda_cca.arn
  handler = "ccaMain.handler"
  runtime = "nodejs10.x"
  publish = true
  tags=local.tags
  environment {
    variables = {
      DistDbTable= local.DistDbTable
      DistDbArn= var.DistDbArn
      DynamoDbTable= local.DynamoDbTable
      DynamoDbArn= var.DynamoDbArn
      AwsRegion = var.AwsRegion
      DstBucket=var.S3DistBucket 
      DstBucketArn=var.S3DistBucketArn
      CcaQueueArn=var.CcaQueueArn
    }
  }

}

/*
*** Begin permissions mods 
*/
data "aws_iam_policy_document" "sqs_allow_doc" {
    statement {
        actions = [
		"iot:Connect",
		"iot:Publish",
	]
        resources = [
		"*"
	]
    }   

    statement {
        actions = [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",

		"sqs:ReceiveMessage",
		"sqs:DeleteMessage",
		"sqs:GetQueueAttributes",

		"dynamodb:GetRecords",
		"dynamodb:GetShardIterator",
		"dynamodb:Query",
                "dynamodb:BatchWriteItem",
                "dynamodb:BatchGetItem",
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
		"s3:GetObject",
		"s3:PutObject",
		"s3:PutObjectAcl"
        ]   
        resources = [
                "arn:aws:logs:*:*:*",
		var.CcaQueueArn,
                var.DistDbArn,
                var.DynamoDbArn,
                "${var.S3DistBucketArn}/*"
        ]   
    }   
}
resource "aws_iam_policy" "ccaMain_allow" {
    name = "ccaMain_allow"
    path = "/"
    policy = data.aws_iam_policy_document.sqs_allow_doc.json
}
resource "aws_iam_role_policy_attachment" "eventwatch_dynamo_policy_attach" {
    role       = aws_iam_role.iam_for_lambda_cca.name
    policy_arn = aws_iam_policy.ccaMain_allow.arn
}
output ddbTable {
	value=local.DynamoDbTable
}

output "qualified_arn" {
  value = "${aws_lambda_function.lambda.qualified_arn}"
}
output "arn" {
  value = "${aws_lambda_function.lambda.arn}"
}
output "invoke_arn" {
  value = "${aws_lambda_function.lambda.invoke_arn}"
}
output "function_name" {
  value = "${aws_lambda_function.lambda.function_name}"
}
output "version" {
  value = "${aws_lambda_function.lambda.version}"
}
