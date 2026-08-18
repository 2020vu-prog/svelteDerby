/*
 cron.tf uses funky/not supported module
 using this snippet from stack overflow
 flipped lambda.qualified_arn to lambda.arn
 */


resource "aws_cloudwatch_event_rule" "derbyMainCron" {
  name                = "derbyMain-1h"
  description         = "Fires every one_hour"
  schedule_expression = "rate(1 hour)"
}

resource "aws_cloudwatch_event_target" "check_dm_every_one_hour" {
  rule      = aws_cloudwatch_event_rule.derbyMainCron.name
  target_id = "check_derbyMain"
  //arn = aws_lambda_function.check_foo.arn
  //arn = module.derbyMainLambda.qualified_arn
  arn = module.derbyMainLambda.arn
}

resource "aws_lambda_permission" "allow_cloudwatch_to_call_derbyMain" {
  statement_id  = "AllowDerbyMainExecFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = module.derbyMainLambda.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.derbyMainCron.arn
}
