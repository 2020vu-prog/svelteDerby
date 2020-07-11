module "sqsLambda" {
  source = "./modules/lambdaSqs"

  DistDbArn=aws_dynamodb_table.derby-distribution.arn
  DynamoDbArn=aws_dynamodb_table.derby-dynamodb-table.arn
  DeployEnvironment=var.DeployEnvironment
  AwsRegion=var.AwsRegion
  S3DistBucket = aws_s3_bucket.dstBucket.id
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
resource "aws_sqs_queue" "TimerWinDeltaQ" {
  name_prefix                             = "TimerWinDeltaQ"
  message_retention_seconds = 900
  receive_wait_time_seconds = 20
  fifo_queue=false

  tags = {
    Environment = "derby"
  }
}
resource "aws_sns_topic" "TimerWinDeltaSns" {
  name = "TimerWinDeltaSns"
}
resource "aws_ssm_parameter" "sns_pass_to_serverless" {
  name        = "/sns/TimerWinDeltaSns/arn"

  description = "arn to publish to TimerWinDeltaSns"
  type        = "SecureString"
  value       = aws_sns_topic.TimerWinDeltaSns.arn
}
resource "aws_sns_topic_subscription" "results_updates_sqs_deltaq" {
    topic_arn = aws_sns_topic.TimerWinDeltaSns.arn
    protocol  = "sqs"
    endpoint  = aws_sqs_queue.TimerWinDeltaQ.arn
}

# resources.tf
resource "aws_sqs_queue_policy" "results_updates_queue_policy" {
    queue_url = aws_sqs_queue.TimerWinDeltaQ.id

    policy = <<POLICY
{
  "Version": "2012-10-17",
  "Id": "sqspolicy",
  "Statement": [
    {
      "Sid": "First",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "sqs:SendMessage",
      "Resource": "${aws_sqs_queue.TimerWinDeltaQ.arn}",
      "Condition": {
        "ArnEquals": {
          "aws:SourceArn": "${aws_sns_topic.TimerWinDeltaSns.arn}"
        }
      }
    }
  ]
}
POLICY
}

