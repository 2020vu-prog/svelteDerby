
variable DeployEnvironment {}
variable DynamoDbArn {}
variable DistDbArn {}
variable TimerDbArn {}
variable TimerProtobufDbArn {}
variable ElapsedTempDbArn {}
variable AwsRegion {}
variable   CcaQueueId  {}
variable   CcaQueueArn  {}
variable     ChartS3BucketName  {}
variable ZelloPushSnsArn{}
variable ApplyTimerSnsArn{}
variable PollyCompleteSnsArn {}
variable RacerStatusFanoutSnsArn {}
variable s3VideoWatch {}
variable s3VideoDone {}
variable AwsCognitoSettingsJson {}

variable S3DistBucket {}
variable S3DistBucketArn {}
locals{
  tags = {
    Environment = var.DeployEnvironment
    CreatedBy = "terraform ${basename(path.cwd)}"
  }
      ddbList= split("/",var.DynamoDbArn)
      DynamoDbTable= element(local.ddbList,length(local.ddbList)-1)

      mainLambdaName="derbyMain"

      distDbList= split("/",var.DistDbArn)
      DistDbTable= element(local.distDbList,length(local.distDbList)-1)
      
      timerDbList= split("/",var.TimerDbArn)
      TimerDbTable= element(local.timerDbList,length(local.timerDbList)-1)
      
      etList= split("/",var.ElapsedTempDbArn)
      ElapsedTempDbTable= element(local.etList,length(local.etList)-1)


      timerProtobufDbList= split("/",var.TimerProtobufDbArn)
      TimerProtobufDbTable= element(local.timerProtobufDbList,length(local.timerProtobufDbList)-1)

      zipFile         = "${path.module}/src/package.zip"
 
	s3VideoWatch=var.s3VideoWatch
	s3VideoDone=var.s3VideoDone


      
}
data "aws_iot_endpoint" "mqtt" {
  endpoint_type="iot:Data-ATS"
}
data "aws_ssm_parameter" "iot_pi_access_url" {
  name           = "/iot/IotPiAccessUrl"
}

resource "aws_lambda_permission" "with_sns" {
  statement_id  = "AllowExecutionFromSNS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.lambda.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = var.ApplyTimerSnsArn
}

resource "aws_lambda_permission" "with_sns_polly" {
  statement_id  = "AllowExecutionFromSNSviaPolly"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.lambda.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = var.PollyCompleteSnsArn
}
resource "aws_lambda_permission" "allow_vod_bucket" {
  statement_id  = "AllowExecutionFromS3Bucket"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.lambda.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = "arn:aws:s3:::${local.s3VideoDone}"
}


resource "aws_sns_topic_subscription" "lambda_sns_sub" {
  topic_arn = var.ApplyTimerSnsArn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.lambda.arn
}

resource "aws_sns_topic_subscription" "lambda_sns_sub_polly" {
  topic_arn = var.PollyCompleteSnsArn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.lambda.arn
}

resource "aws_s3_bucket_notification" "bucket_notification" {
  bucket = local.s3VideoDone

  lambda_function {
    lambda_function_arn = aws_lambda_function.lambda.arn
    events              = ["s3:ObjectCreated:*"]
    filter_suffix       = ".mp4"
  }

  depends_on = [aws_lambda_permission.allow_vod_bucket]
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
         "edgelambda.amazonaws.com",
      ]
      type        = "Service"
    }

    actions = ["sts:AssumeRole" ]
  }
}



resource "aws_iam_role" "iam_for_lambda" {
  name_prefix               = "iam_for_lambda_"
  assume_role_policy = data.aws_iam_policy_document.policy.json
  tags=local.tags
}

resource "aws_cloudwatch_log_group" "derbyMainLogRetention" {
  name              = "/aws/lambda/${local.mainLambdaName}"
  retention_in_days = 1
}
resource "aws_lambda_function_url" "lambda" {
  function_name      = aws_lambda_function.lambda.function_name
  authorization_type = "NONE"
  cors  {
    allow_credentials = true
    allow_origins     = ["*"]
    allow_methods     = ["*"]
    allow_headers     = ["date", "keep-alive", "x-invoke-key"]
    expose_headers    = ["keep-alive", "date", "x-invoke-key"]
    max_age           = 86400
  }
}

resource "aws_lambda_function" "lambda" {
  function_name = local.mainLambdaName

  filename         = local.zipFile
  source_code_hash = filebase64sha256(local.zipFile)

  timeout = 10 // increased for bulkAdd
  role    = aws_iam_role.iam_for_lambda.arn
  handler = "derbyMain.handler"
  runtime = "nodejs16.x"
  memory_size=1024
  publish = true
  tags=local.tags
  environment {
    variables = {
      IotPiAccessUrl=data.aws_ssm_parameter.iot_pi_access_url.value
      DeployEnvironment= var.DeployEnvironment
      DynamoDbTable= local.DynamoDbTable
      DynamoDbArn= var.DynamoDbArn

      DistDbTable= local.DistDbTable
      DistDbArn= var.DistDbArn

      ElapsedTempDbTable= local.ElapsedTempDbTable
      ElapsedTempDbArn= var.ElapsedTempDbArn


      // used to populate mp3
      DstBucket     = var.S3DistBucket
      DstBucketArn  = var.S3DistBucketArn

      TimerDbTable= local.TimerDbTable
      TimerDbArn= var.TimerDbArn

      TimerProtobufDbTable= local.TimerProtobufDbTable
      TimerProtobufDbArn= var.TimerProtobufDbArn

      CcaQueueId =var.CcaQueueId 
      ChartS3BucketName  =  var.ChartS3BucketName  
      AwsRegion = var.AwsRegion
      PollyCompleteSnsArn=var.PollyCompleteSnsArn
      ZelloPushSnsArn=var.ZelloPushSnsArn
      RacerStatusFanoutSnsArn=var.RacerStatusFanoutSnsArn
      IotEndpoint=data.aws_iot_endpoint.mqtt.endpoint_address
	AwsCognitoSettingsJson=var.AwsCognitoSettingsJson

	s3VideoWatch=local.s3VideoWatch
	s3VideoDone=local.s3VideoDone
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

		"s3:ListObjects",
		"s3:ListBucket",
		"s3:GetObject",
		"s3:PutObject",


		"dynamodb:Query",
                "dynamodb:BatchWriteItem",
                "dynamodb:BatchGetItem",
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",

        ]   
        resources = [
            "arn:aws:s3:::${var.ChartS3BucketName}",
            "arn:aws:s3:::${var.ChartS3BucketName}/*",

            "arn:aws:s3:::${var.S3DistBucket}",
            "arn:aws:s3:::${var.S3DistBucket}/*",


            "arn:aws:s3:::${local.s3VideoDone}",
            "arn:aws:s3:::${local.s3VideoDone}/*",

            "arn:aws:s3:::${local.s3VideoWatch}",
            "arn:aws:s3:::${local.s3VideoWatch}/*",

                "arn:aws:logs:*:*:*",
                var.CcaQueueArn,
                var.DynamoDbArn,
                var.DistDbArn,
                var.TimerDbArn,
                var.ElapsedTempDbArn,
                var.TimerProtobufDbArn
        ]   
    }   
    statement {
        actions = [
		"iot:AttachPrincipalPolicy",
		"polly:StartSpeechSynthesisTask",
		"polly:SynthesizeSpeech",
        ]
        resources = [
                "*"
        ]
    }
    statement {
        actions = [
              "SNS:Publish",
        ]
        resources = [
	//PollyCompleteSnsArn
                var.RacerStatusFanoutSnsArn,
                var.ZelloPushSnsArn,
                "*"
        ]
    }
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
            "ec2:RunInstances",
        ]
        resources = [
                "*"
        ]
    }

}
resource "aws_iam_policy" "cloudwatch_allow" {
    name_prefix = "cloudwatch_allow_"
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
output "lambda_function_url" {
  value = aws_lambda_function_url.lambda.function_url
}
