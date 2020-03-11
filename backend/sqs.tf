module "sqsLambda" {
  source = "./modules/lambdaSqs"

  DistDbArn=aws_dynamodb_table.derby-distribution.arn
  DynamoDbArn=aws_dynamodb_table.derby-dynamodb-table.arn
  DeployEnvironment=var.DeployEnvironment
  AwsRegion=var.AwsRegion
  S3DistBucket = local.S3DistBucket
  S3DistBucketArn = aws_s3_bucket.dstBucket.arn
  CcaQueueArn  = aws_sqs_queue.cacheAlignmentQueue.arn
  
}
resource "aws_lambda_event_source_mapping" "sqs_lambda_link" {
  event_source_arn  = aws_sqs_queue.cacheAlignmentQueue.arn
  function_name     = module.sqsLambda.function_name
  batch_size=10  
}
resource "aws_sqs_queue" "cacheAlignmentQueue" {
  name_prefix                      = "derby-cache-alignment"
  message_retention_seconds = 900
  receive_wait_time_seconds = 20
  fifo_queue=true

  tags = {
    Environment = "derby"
  }
}
