

variable DeployEnvironment {}
variable AwsRegion {}

locals{
  tags = {
    Environment = var.DeployEnvironment
    CreatedBy = "terraform ${basename(path.cwd)}"
  }


      
}
resource "aws_cloudformation_stack" "vodTranscodeStack" {
  name = "vod-transcode-stack"
  template_body=file("${path.module}/watchFolder.yaml")
  capabilities=["CAPABILITY_NAMED_IAM"]

  parameters = {
    NotifcationEmail="2020vu+videoJobDone@gmail.com"
  }
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

