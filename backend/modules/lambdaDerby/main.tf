
provider "archive" {}
variable DeployEnvironment {}
variable DynamoDbArn {}
variable DistDbArn {}
variable AwsRegion {}
variable   CcaQueueId  {}
variable   CcaQueueArn  {}
locals{
  tags = {
    Environment = var.DeployEnvironment
    CreatedBy = "terraform ${basename(path.cwd)}"
  }
      ddbList= split("/",var.DynamoDbArn)
      DynamoDbTable= element(local.ddbList,length(local.ddbList)-1)

      distDbList= split("/",var.DistDbArn)
      DistDbTable= element(local.distDbList,length(local.distDbList)-1)
      
}

data "archive_file" "zip" {
  type        = "zip"
  //source_file = "${path.module}/src/derbyMain.js"
  source_dir = "${path.module}/src/"
  output_path = "tmp/build/derbyMain.zip"
}
/*
resource "null_resource" "zip_the_node_folder" {
  triggers = {
    build_number = timestamp()
  }

  provisioner "local-exec" {
    command = "zip -r9 tmp/build/derbyMain.zip2 src"
    working_dir = "${path.module}"
  }

  depends_on = [null_resource.python_with_packages]
}
*/

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

  timeout = 4 // increased for bulkAdd
  role    = aws_iam_role.iam_for_lambda.arn
  handler = "derbyMain.handler"
  runtime = "nodejs12.x"
  publish = true
  tags=local.tags
  environment {
    variables = {
      DynamoDbTable= local.DynamoDbTable
      DynamoDbArn= var.DynamoDbArn

      DistDbTable= local.DistDbTable
      DistDbArn= var.DistDbArn
      CcaQueueId =var.CcaQueueId 

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
		"sqs:SendMessage",
		"dynamodb:Query",
                "dynamodb:BatchWriteItem",
                "dynamodb:BatchGetItem",
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem"
        ]   
        resources = [
                "arn:aws:logs:*:*:*",
                var.CcaQueueArn,
                var.DynamoDbArn,
                var.DistDbArn
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
