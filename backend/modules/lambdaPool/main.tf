
variable DeployEnvironment {}
variable DynamoDbArn {}
variable AwsRegion {}

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
  source_dir = "${path.module}/src/"
  output_path = "tmp/build/poolMain.zip"
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
         "lambda.amazonaws.com"
      ]
      type        = "Service"
    }

    actions = ["sts:AssumeRole" ]
  }
  statement {
    sid    = ""
    effect = "Allow"

    principals {
      identifiers = [
	"cognito-idp.amazonaws.com"

      ]
      type        = "Service"
    }

    actions = ["sts:AssumeRole" ]
  }
}



resource "aws_iam_role" "iam_for_lambda_pool" {
  name               = "iam_for_lambda_pool"
  assume_role_policy = data.aws_iam_policy_document.policy.json
  tags=local.tags
}

resource "aws_lambda_function" "lambda" {
  function_name = "poolMain"

  filename         = data.archive_file.zip.output_path
  source_code_hash = data.archive_file.zip.output_base64sha256

  role    = aws_iam_role.iam_for_lambda_pool.arn
  handler = "poolMain.handler"
  runtime = "nodejs12.x"
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
data "aws_iam_policy_document" "pool_allow_doc" {

    statement {
        actions = [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",


		"dynamodb:GetRecords",
		"dynamodb:GetShardIterator",
		"dynamodb:Query",
                "dynamodb:BatchGetItem",
                "dynamodb:GetItem"
        ]   
        resources = [
                "arn:aws:logs:*:*:*",
                var.DynamoDbArn
        ]   
    }   
}
resource "aws_iam_policy" "pool_allow" {
    name = "pool_allow"
    path = "/"
    policy = data.aws_iam_policy_document.pool_allow_doc.json
}
resource "aws_iam_role_policy_attachment" "eventwatch_pool_policy_attach" {
    role       = aws_iam_role.iam_for_lambda_pool.name
    policy_arn = aws_iam_policy.pool_allow.arn
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
