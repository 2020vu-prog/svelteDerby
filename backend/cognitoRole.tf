
data "aws_caller_identity" "current" {}
locals {
  accountId = data.aws_caller_identity.current.account_id
  IotArn    = "arn:aws:iot:${var.AwsRegion}:${local.accountId}"
}

// Condition added to placate inane error.  this resource s/b obsolete. Apr 2024
resource "aws_iam_role" "authenticated" {
  name_prefix          = "cognito_authenticated_"
  permissions_boundary = var.ManagedRolePermissionsBoundaryArn

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "cognito-identity.amazonaws.com"
      },
	"Condition": {
		"ForAnyValue:StringLike": {
		"cognito-identity.amazonaws.com:amr": "authenticated"
		}
	},
      "Action": "sts:AssumeRoleWithWebIdentity"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy" "authenticated" {
  name = "authenticated_policy"
  role = aws_iam_role.authenticated.id

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "mobileanalytics:PutEvents",
        "cognito-sync:*",
        "cognito-identity:*"
      ],
      "Resource": [
        "*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "iot:Subscribe",
        "iot:Connect",
        "iot:Receive"
      ],
      "Resource": "${local.IotArn}:*"
    }
  ]
}
EOF
}

/*
**
** as of June 2020, IAM policies do not allow access to iot.  need iot core policy
**
*/
resource "aws_iot_policy" "subToAnyTopic" {
  name = "SubToAnyTopic"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "iot:Subscribe",
        "iot:Connect",
        "iot:Receive"
      ],
      "Effect": "Allow",
      "Resource": "*"
    }
  ]
}
EOF
}

resource "aws_cognito_identity_pool_roles_attachment" "main" {
  identity_pool_id = aws_cognito_identity_pool.derbyMainIdp.id


  roles = {
    "authenticated"   = aws_iam_role.authenticated.arn
    "unauthenticated" = aws_iam_role.authenticated.arn
  }
}
data "aws_iot_endpoint" "mqtt" {
  endpoint_type = "iot:Data-ATS"
}
output "mqttEndpoint" {
  value = data.aws_iot_endpoint.mqtt
}
output "mqttPolicy" {
  value = aws_iam_role_policy.authenticated.policy
}
