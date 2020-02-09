locals {
  dbName="DerbyMain"
}
resource "aws_dynamodb_table" "derby-dynamodb-table" {
  name           = local.dbName
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "PK"
  range_key      = "SK"
  stream_enabled = true
  stream_view_type = "NEW_AND_OLD_IMAGES"
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
