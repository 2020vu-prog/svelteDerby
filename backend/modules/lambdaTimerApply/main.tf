
provider "archive" {}
variable DeployEnvironment {}
variable DynamoDbArn {}
variable AwsRegion {}
variable ApplyTimerSnsArn {}
locals{
  tags = {
    Environment = var.DeployEnvironment
    CreatedBy = "terraform ${basename(path.cwd)}"
  }
      ddbList= split("/",var.DynamoDbArn)
      DynamoDbTable= element(local.ddbList,length(local.ddbList)-1)

      timerLambdaName="timerApplyFromSns"

      
      
}

data "archive_file" "zip" {
  type        = "zip"
  //source_file = "${path.module}/src/applyTimerMain.js"
  source_dir = "${path.module}/src/"
  output_path = "tmp/build/applyTimerMain.zip"
  depends_on = [null_resource.install_npm_deps]
}

resource "null_resource" "install_npm_deps" {
  provisioner "local-exec" {
    command = "npm install"
    working_dir = "${path.module}/src/"
  }
}

data "aws_iam_policy_document" "policy" {
  statement {
    sid    = ""
    effect = "Allow"

    principals {
      identifiers = [
         "lambda.amazonaws.com",
      ]
      type        = "Service"
    }

    actions = ["sts:AssumeRole" ]
  }
}



resource "aws_lambda_permission" "with_sns" {
  statement_id  = "AllowExecutionFromSNS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.lambda.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = var.ApplyTimerSnsArn
}

resource "aws_sns_topic_subscription" "lambda_sns_sub" {
  topic_arn = var.ApplyTimerSnsArn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.lambda.arn
}

resource "aws_iam_role" "iam_for_lambda" {
  name_prefix               = "iam_for_lambda"
  assume_role_policy = data.aws_iam_policy_document.policy.json
  tags=local.tags
}

resource "aws_cloudwatch_log_group" "applyTimerMainLogRetention" {
  name              = "/aws/lambda/${local.timerLambdaName}"
  retention_in_days = 5
}

resource "aws_lambda_function" "lambda" {
  function_name = local.timerLambdaName

  filename         = data.archive_file.zip.output_path
  source_code_hash = data.archive_file.zip.output_base64sha256

  timeout = 4 // increased for bulkAdd
  role    = aws_iam_role.iam_for_lambda.arn
  handler = "applyTimerMain.handler"
  runtime = "nodejs12.x"
  publish = true
  tags=local.tags
  environment {
    variables = {
      DynamoDbTable= local.DynamoDbTable
      DynamoDbArn= var.DynamoDbArn


	ApplyTimerSnsArn = var.ApplyTimerSnsArn 
      AwsRegion = var.AwsRegion
    }
  }

}

/*
*** Begin permissions mods 
*/
data "aws_iam_policy_document" "cloudwatch_allow_doc" {
    statement {
        actions = [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",

		"dynamodb:Query",
                "dynamodb:BatchWriteItem",
                "dynamodb:BatchGetItem",
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",

        ]   
        resources = [
                "arn:aws:logs:*:*:*",
                var.DynamoDbArn,
        ]   
    }   
    statement {
        actions = [
		"iot:AttachPrincipalPolicy",
        ]
        resources = [
                "*"
        ]
    }
}
resource "aws_iam_policy" "cloudwatch_allow" {
    name_prefix = "cloudwatch_allow"
    path = "/"
    policy = data.aws_iam_policy_document.cloudwatch_allow_doc.json
}
resource "aws_iam_role_policy_attachment" "eventwatch_cw_policy_attach" {
    role       = aws_iam_role.iam_for_lambda.name
    policy_arn = aws_iam_policy.cloudwatch_allow.arn
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
