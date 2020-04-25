locals {
}
module "derbyPoolLambda" {
  source = "./modules/lambdaPool"

  DynamoDbArn=aws_dynamodb_table.derby-dynamodb-table.arn
  DeployEnvironment=var.DeployEnvironment
  AwsRegion=var.AwsRegion
  
}
