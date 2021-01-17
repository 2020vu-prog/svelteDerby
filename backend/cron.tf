module "lambda-cloudwatch-trigger" {
  source  = "infrablocks/lambda-cloudwatch-events-trigger/aws"
  region                = var.AwsRegion
  component             = "cron_derby_archiver"
  deployment_identifier = "production"

  lambda_arn =  module.derbyMainLambda.qualified_arn
  lambda_function_name = module.derbyMainLambda.function_name
  lambda_schedule_expression = "cron(44 * * * ? *)"
}
