

variable DeployEnvironment {}
variable AwsRegion {}

locals{
  tags = {
    Environment = var.DeployEnvironment
    CreatedBy = "terraform ${basename(path.cwd)}"
  }
}


resource "aws_s3_bucket" "lambdaSrcBucket" {
  bucket_prefix = "vod-lambda-src-"
  acl    = "private"
}

resource "aws_s3_bucket_object" "vod_src_file_upload" {
  bucket = aws_s3_bucket.lambdaSrcBucket.id
  key    = "vodTranscode/lambda.zip"
  source = "${path.module}/src/lambda.zip"
  etag   = filemd5("${path.module}/src/lambda.zip")
}

resource "aws_cloudformation_stack" "vodTranscodeStack" {
  name = "vod-transcode-stack"
  template_body=file("${path.module}/watchFolder.yaml")
  capabilities=["CAPABILITY_NAMED_IAM"]

  parameters = {
    NotifcationEmail="2020vu+videoJobDone@gmail.com"
    LambdaSrcBucket=aws_s3_bucket.lambdaSrcBucket.id
  }
  depends_on = [ aws_s3_bucket_object.vod_src_file_upload ]
}

output MediaBucket {
	value=aws_cloudformation_stack.vodTranscodeStack.outputs.MediaBucket
}
output WatchFolderBucket {
	value=aws_cloudformation_stack.vodTranscodeStack.outputs.WatchFolderBucket
}
output VodCompleteSnsArn {
	value=aws_cloudformation_stack.vodTranscodeStack.outputs.NotificationSnsArn
}

