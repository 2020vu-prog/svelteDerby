variable "AwsRegion" {}
variable "DeployEnvironment" {}
variable "ManagedRolePermissionsBoundaryArn" {}
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
  backend "s3" { key = "backend/code" }
}
provider "aws" {


  region = var.AwsRegion
}

//TODO: likely issue stanging up new env with resource pre-req :-(
data "aws_dynamodb_table" "timer-protobuf" {
  name = "timer-protobuf"
}
module "derbyMainLambda" {
  source = "./modules/lambdaDerby"

  ChartS3BucketName                 = aws_s3_bucket.svelteBucket.id
  CcaQueueId                        = aws_sqs_queue.cacheAlignmentQueue.id
  CcaQueueArn                       = aws_sqs_queue.cacheAlignmentQueue.arn
  DynamoDbArn                       = aws_dynamodb_table.derby-dynamodb-table.arn
  DistDbArn                         = aws_dynamodb_table.derby-distribution.arn
  TimerDbArn                        = aws_dynamodb_table.timer-dynamodb-table.arn
  TimerProtobufDbArn                = data.aws_dynamodb_table.timer-protobuf.arn
  ElapsedTempDbArn                  = aws_dynamodb_table.elapsed-temp-table.arn
  DeployEnvironment                 = var.DeployEnvironment
  AwsRegion                         = var.AwsRegion
  AddEventSnsArn                    = aws_sns_topic.AddEventSns.arn
  ApplyTimerSnsArn                  = aws_sns_topic.TimerWinDeltaSns.arn
  PollyCompleteSnsArn               = aws_sns_topic.PollyCompleteSns.arn
  ZelloPushSnsArn                   = aws_sns_topic.ZelloPushSns.arn
  RacerStatusFanoutSnsArn           = aws_sns_topic.RacerStatusFanout.arn
  S3DistBucket                      = aws_s3_bucket.dstBucket.id
  S3DistBucketArn                   = aws_s3_bucket.dstBucket.arn
  s3VideoWatch                      = module.vodTranscode.WatchFolderBucket
  s3VideoDone                       = module.vodTranscode.MediaBucket
  AwsCognitoSettingsJson            = local.awsCognitoSettingsJson
  GitBreadcrumbParameterArn         = aws_ssm_parameter.git_breadcrumb.arn
  ManagedRolePermissionsBoundaryArn = var.ManagedRolePermissionsBoundaryArn

}
