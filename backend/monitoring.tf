variable "CloudWatchAlarmEmailAddresses" {
  description = "Email addresses to subscribe to backend CloudWatch alarms. Each address must confirm its SNS subscription."
  type        = set(string)
  default     = []
}

data "aws_partition" "current" {}

locals {
  alert_name_prefix = "svelte-derby-${replace(var.DeployEnvironment, ".", "-")}"

  monitored_lambda_functions = {
    derbyMain  = module.derbyMainLambda.function_name
    dynamoMain = module.derbyDynamoLambda.function_name
    sqsCcaMain = module.sqsLambda.function_name
  }
}

resource "aws_sns_topic" "backend_alarms" {
  name = "${local.alert_name_prefix}-backend-alarms"

  tags = {
    Environment = var.DeployEnvironment
    CreatedBy   = "terraform ${basename(path.cwd)}"
  }
}

data "aws_iam_policy_document" "backend_alarms_topic" {
  statement {
    sid    = "TopicOwnerManagement"
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = ["*"]
    }

    actions   = ["SNS:*"]
    resources = [aws_sns_topic.backend_alarms.arn]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceOwner"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }

  statement {
    sid    = "AllowCloudWatchAlarmsToPublish"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudwatch.amazonaws.com"]
    }

    actions   = ["SNS:Publish"]
    resources = [aws_sns_topic.backend_alarms.arn]

    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"
      values = [
        "arn:${data.aws_partition.current.partition}:cloudwatch:${var.AwsRegion}:${data.aws_caller_identity.current.account_id}:alarm:*"
      ]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

resource "aws_sns_topic_policy" "backend_alarms" {
  arn    = aws_sns_topic.backend_alarms.arn
  policy = data.aws_iam_policy_document.backend_alarms_topic.json
}

resource "aws_sns_topic_subscription" "backend_alarm_email" {
  for_each = var.CloudWatchAlarmEmailAddresses

  topic_arn = aws_sns_topic.backend_alarms.arn
  protocol  = "email"
  endpoint  = each.value
}

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  for_each = local.monitored_lambda_functions

  depends_on = [aws_sns_topic_policy.backend_alarms]

  alarm_name          = "${local.alert_name_prefix}-${each.key}-lambda-errors"
  alarm_description   = "${each.value} reported one or more failed invocations. Check /aws/lambda/${each.value}."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 60
  statistic           = "Sum"
  threshold           = 1
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = each.value
  }

  alarm_actions = [aws_sns_topic.backend_alarms.arn]
  ok_actions    = [aws_sns_topic.backend_alarms.arn]
}

resource "aws_cloudwatch_log_metric_filter" "lambda_logged_errors" {
  for_each = local.monitored_lambda_functions

  name           = "${local.alert_name_prefix}-${each.key}-logged-errors"
  log_group_name = "/aws/lambda/${each.value}"
  pattern        = "?ERROR ?Error ?Exception ?\"Task timed out\" ?\"Process exited before completing request\""

  metric_transformation {
    name          = "${each.key}LoggedErrors"
    namespace     = "SvelteDerby/${var.DeployEnvironment}"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_metric_alarm" "lambda_logged_errors" {
  for_each = local.monitored_lambda_functions

  depends_on = [aws_sns_topic_policy.backend_alarms]

  alarm_name          = "${local.alert_name_prefix}-${each.key}-logged-errors"
  alarm_description   = "${each.value} logged one or more error-like events. Check /aws/lambda/${each.value}."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "${each.key}LoggedErrors"
  namespace           = "SvelteDerby/${var.DeployEnvironment}"
  period              = 60
  statistic           = "Sum"
  threshold           = 1
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.backend_alarms.arn]
  ok_actions    = [aws_sns_topic.backend_alarms.arn]
}

output "BackendAlarmSnsTopicArn" {
  description = "SNS topic that receives backend CloudWatch alarm state changes."
  value       = aws_sns_topic.backend_alarms.arn
}
