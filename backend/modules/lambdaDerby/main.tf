
provider "archive" {}
locals{
  tags = {
    Environment = var.DeployEnvironment
    CreatedBy = "terraform ${basename(path.cwd)}"
  }
      ddbList= split("/",var.DynamoDbArn)
      DynamoDbTable= element(local.ddbList,length(local.ddbList)-1)
      
}

data "archive_file" "zip" {
  type        = "zip"
  //source_file = "${path.module}/src/derbyMain.js"
  source_dir = "${path.module}/src/"
  output_path = "tmp/build/derbyMain.zip"
}

data "aws_iam_policy_document" "policy" {
  statement {
    sid    = ""
    effect = "Allow"

    principals {
      identifiers = [
         "lambda.amazonaws.com",
         "edgelambda.amazonaws.com",
      ]
      type        = "Service"
    }

    actions = ["sts:AssumeRole" ]
  }
}



resource "aws_iam_role" "iam_for_lambda" {
  name               = "iam_for_lambda"
  assume_role_policy = data.aws_iam_policy_document.policy.json
  tags=local.tags
}

resource "aws_lambda_function" "lambda" {
  function_name = "derbyMain"

  filename         = data.archive_file.zip.output_path
  source_code_hash = data.archive_file.zip.output_base64sha256

  role    = aws_iam_role.iam_for_lambda.arn
  handler = "derbyMain.handler"
  runtime = "nodejs10.x"
  publish = true
  tags=local.tags
  environment {
    variables = {
      DynamoDbTable= local.DynamoDbTable
      DynamoDbArn= var.DynamoDbArn
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
                "dynamodb:UpdateItem"
        ]   
        resources = [
                "arn:aws:logs:*:*:*",
                var.DynamoDbArn
        ]   
    }   
}
resource "aws_iam_policy" "cloudwatch_allow" {
    name = "cloudwatch_allow"
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
