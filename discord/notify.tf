module "sns_topic1" {
  source  = "terraform-aws-modules/sns/aws"
  version = "~> 3.0"

  name_prefix = "discordMp3"
  policy = <<POLICY
{
    "Version":"2012-10-17",
    "Statement":[{
        "Effect": "Allow",
        "Principal": { "Service": "s3.amazonaws.com" },
        "Action": "SNS:Publish",
        "Resource": "arn:aws:sns:*:*:*",
        "Condition":{
            "ArnLike":{"aws:SourceArn":"${module.boot_bucket.s3_bucket_arn}"}
        }
    }]
}
POLICY
}


resource "aws_s3_bucket_notification" "bucket_notification" {
  bucket = module.boot_bucket.s3_bucket_id

  topic {
    topic_arn     = module.sns_topic1.sns_topic_arn
    events        = ["s3:ObjectCreated:*"]
    filter_suffix = ".mp3"
  }
}
resource "aws_ssm_parameter" "sns-topic" {
  name  = "/${var.DeployEnvironment}/discord-bot/sns-topic"
  type  = "String"
  value = module.sns_topic1.sns_topic_arn
}
