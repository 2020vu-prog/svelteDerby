/*
** derived From: https://learn.hashicorp.com/terraform/aws/lambda-api-gateway
**
*/
variable AwsRegion {}
variable DeployEnvironment {}
 provider "aws" {
  version = "~> 2.0"

   region = var.AwsRegion
 }

module "derbyMainLambda" {
  source = "./modules/lambdaDerby"

    ChartS3BucketName  =  aws_s3_bucket.svelteBucket.id
    CcaQueueId  = aws_sqs_queue.cacheAlignmentQueue.id
    CcaQueueArn  = aws_sqs_queue.cacheAlignmentQueue.arn
  DynamoDbArn=aws_dynamodb_table.derby-dynamodb-table.arn
  DistDbArn=aws_dynamodb_table.derby-distribution.arn
  TimerDbArn=aws_dynamodb_table.timer-dynamodb-table.arn
  DeployEnvironment=var.DeployEnvironment
  AwsRegion=var.AwsRegion
  
}

 resource "aws_api_gateway_resource" "proxy" {
   rest_api_id = aws_api_gateway_rest_api.derbyApp.id
   parent_id   = aws_api_gateway_rest_api.derbyApp.root_resource_id
   path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "proxy" {
   rest_api_id   = aws_api_gateway_rest_api.derbyApp.id
   resource_id   = aws_api_gateway_resource.proxy.id
   http_method   = "ANY"
   //authorization = "NONE"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.require_pool.id
 }

resource "aws_api_gateway_integration" "lambda" {
   rest_api_id = aws_api_gateway_rest_api.derbyApp.id
   resource_id = aws_api_gateway_method.proxy.resource_id
   http_method = aws_api_gateway_method.proxy.http_method

   integration_http_method = "POST"
   type                    = "AWS_PROXY"
   uri                     = module.derbyMainLambda.invoke_arn
 }
resource "aws_api_gateway_method" "proxy_root" {
   rest_api_id   = aws_api_gateway_rest_api.derbyApp.id
   resource_id   = aws_api_gateway_rest_api.derbyApp.root_resource_id
   http_method   = "ANY"
   //authorization = "NONE"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.require_pool.id
 }

 resource "aws_api_gateway_integration" "lambda_root" {
   rest_api_id = aws_api_gateway_rest_api.derbyApp.id
   resource_id = aws_api_gateway_method.proxy_root.resource_id
   http_method = aws_api_gateway_method.proxy_root.http_method

   integration_http_method = "POST"
   type                    = "AWS_PROXY"
   uri                     = module.derbyMainLambda.invoke_arn
 }

resource "aws_api_gateway_deployment" "derbyMain" {
   depends_on = [
     aws_api_gateway_integration.lambda,
     aws_api_gateway_integration.lambda_root,
   ]

   rest_api_id = aws_api_gateway_rest_api.derbyApp.id
   stage_name  = "test"
 }

 resource "aws_lambda_permission" "apigw" {
   statement_id  = "AllowAPIGatewayInvoke"
   action        = "lambda:InvokeFunction"
   function_name = module.derbyMainLambda.function_name
   principal     = "apigateway.amazonaws.com"

   # The "/*/*" portion grants access from any method on any resource
   # within the API Gateway REST API.
   source_arn = "${aws_api_gateway_rest_api.derbyApp.execution_arn}/*/*"
 }

resource "aws_api_gateway_authorizer" "require_pool" {
  name                   = "Require_id_pool"
  rest_api_id            = aws_api_gateway_rest_api.derbyApp.id
  type                   = "COGNITO_USER_POOLS"
  provider_arns          = [ aws_cognito_user_pool.derbyUserPool.arn]
}

output "base_url" {
  value = aws_api_gateway_deployment.derbyMain.invoke_url
}
output "apiGateway" {
  value = aws_api_gateway_deployment.derbyMain
}
