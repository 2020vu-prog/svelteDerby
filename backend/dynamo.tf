
locals{
  dbName="DerbyMain"
  distDbName="DerbyDist"
  timerDbName="DerbyTimer"
  S3DistBucketPrefix="derby-dst-bucket"
}
resource "aws_dynamodb_table" "timer-dynamodb-table" {
  name           = local.timerDbName
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "PK"
  range_key      = "SK"
  stream_enabled = false
  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }
  ttl {
    attribute_name = "TTL"
    enabled        = true
  }
  tags = {
    Name           = local.timerDbName
    DeployEnvironment = var.DeployEnvironment
  }
}
resource "aws_dynamodb_table" "derby-dynamodb-table" {
  name           = local.dbName
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "PK"
  range_key      = "SK"
  stream_enabled = true
  stream_view_type = "NEW_IMAGE"
  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }
  ttl {
    attribute_name = "TTL"
    enabled        = true
  }
  tags = {
    Name           = local.dbName
    DeployEnvironment = var.DeployEnvironment
  }
}
resource "null_resource" "seed_derby_orgs" {

  provisioner "local-exec" {
    command = "scripts/seedDerbyOrgs.sh"
    working_dir = path.module
    environment = {
    	TableName= aws_dynamodb_table.derby-dynamodb-table.name
    }
  }

  depends_on = [ aws_s3_bucket.svelteBucket ]
}
resource "aws_dynamodb_table" "derby-distribution" {
  name           = local.distDbName
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "DP"
  range_key      = "DS"
  stream_enabled = false
  //stream_view_type = "NEW_AND_OLD_IMAGES"
  attribute {
    name = "DP"
    type = "S"
  }

  attribute {
    name = "DS"
    type = "N"
  }
  ttl {
    attribute_name = "TTL"
    enabled        = true
  }
  tags = {
    Name           = local.distDbName
    DeployEnvironment = var.DeployEnvironment
  }
}
resource "aws_s3_bucket" "dstBucket" {
  bucket_prefix = local.S3DistBucketPrefix
  acl    = "private"
  cors_rule {
          allowed_headers = [
              "*",
            ] 
           allowed_methods = [
               "PUT",
               "POST",
               "DELETE",
               "GET",
            ] 
           allowed_origins = [
               "*",
            ] 
           expose_headers  = []
           max_age_seconds = 0 
        }
}
module "derbyDynamoLambda" {
  source = "./modules/lambdaDynamo"

  DistDbArn=aws_dynamodb_table.derby-distribution.arn
  DynamoDbArn=aws_dynamodb_table.derby-dynamodb-table.arn
  DynamoDbStreamArn=aws_dynamodb_table.derby-dynamodb-table.stream_arn
  DeployEnvironment=var.DeployEnvironment
  AwsRegion=var.AwsRegion
  S3DistBucket = aws_s3_bucket.dstBucket.id
  S3DistBucketArn = aws_s3_bucket.dstBucket.arn
  
}
resource "aws_lambda_event_source_mapping" "dynamo_stream_link" {
  event_source_arn  = aws_dynamodb_table.derby-dynamodb-table.stream_arn
  function_name     = module.derbyDynamoLambda.function_name
  starting_position = "LATEST"
  maximum_batching_window_in_seconds=2  // consolidate clustered updates into single iot publish
  batch_size=10  // default of 100 takes too long to process and caused lambda timeout error LOOP!
  //maximum_retry_attempts=5
}
output bucket {
	value=aws_s3_bucket.dstBucket
}
