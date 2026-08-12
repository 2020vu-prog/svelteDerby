variable "GoogleClientId" {}
variable "GoogleClientSecret" {}
locals {
	cognitoDomain= replace(var.DnsDomain, "/\\./", "-")

}
data "aws_region" "current" {}
resource "aws_cognito_user_pool_domain" "derbyUserPool" {
  domain                     = "${local.cognitoDomain}"
  user_pool_id = aws_cognito_user_pool.derbyUserPool.id
}

resource "aws_cognito_user_pool" "derbyUserPool" {
  name = "derbyUserPool"
  email_verification_subject = "User Verification for ${var.DeployEnvironment}"
  auto_verified_attributes   = ["email"]
  schema {
    attribute_data_type = "String"
    name                = "email"

    developer_only_attribute = false
    mutable                  = true
    required                 = true

    string_attribute_constraints {
      max_length = "2048"
      min_length = "0"
    }
  }
  //lambda_config {
  //  create_auth_challenge = module.cognito_define_auth_function.lambda_function_arn

  //}
}
resource "aws_cognito_user_pool_client" "sveltePoolClient" {
  name = "sveltePoolClient"

      access_token_validity                         = 720 
      id_token_validity                             = 720

      token_validity_units {
          access_token  = "minutes"
          id_token      = "minutes"
          refresh_token = "days" 
        }
  user_pool_id = aws_cognito_user_pool.derbyUserPool.id
}
resource "aws_cognito_user_pool_client" "svelteHostedPoolClient" {
  name = "svelteHostedPoolClient"

  user_pool_id = aws_cognito_user_pool.derbyUserPool.id
  allowed_oauth_flows = [
    // "code",
    "implicit",
  ]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes = [
    "email",
    "openid",
  ]
  explicit_auth_flows = [
    "ALLOW_CUSTOM_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH",
  ]
  supported_identity_providers = [
    "COGNITO",
    "Google",
  ]
// wtf... these are for hosted ui!
  logout_urls                                 = [
        "https://0.0.0.0:8080/",
        "https://localhost:5173/",
        "https://d38fl44wj64v4n.cloudfront.net/",
        "https://${local.DnsCfAliasFq}/",
        ]
  callback_urls                                 = [
        "https://0.0.0.0:8080/",
        "https://localhost:5173/",
        "https://d38fl44wj64v4n.cloudfront.net/",
        "https://${local.DnsCfAliasFq}/",
        ]
}
resource "aws_cognito_identity_provider" "google" {
  user_pool_id  = aws_cognito_user_pool.derbyUserPool.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    authorize_scopes                = "email profile"
    client_id                       = var.GoogleClientId
    client_secret                   = var.GoogleClientSecret
    "attributes_url"                = "https://people.googleapis.com/v1/people/me?personFields="
    "attributes_url_add_attributes" = "true"
    "authorize_url"                 = "https://accounts.google.com/o/oauth2/v2/auth"
    "oidc_issuer"                   = "https://accounts.google.com"
    "token_request_method"          = "POST"
    "token_url"                     = "https://www.googleapis.com/oauth2/v4/token"
  }

  attribute_mapping = {
    email    = "email"
    username = "sub"
    name = "name"
    profile = "profile"
  }
}
resource "aws_cognito_user_pool_client" "idpLink" {
  name = "ipdLink"

  user_pool_id = aws_cognito_user_pool.derbyUserPool.id
}
resource "aws_cognito_identity_pool" "derbyMainIdp" {
  identity_pool_name               = "derbyMainIdp"
  allow_unauthenticated_identities = false

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.idpLink.id
    provider_name           = aws_cognito_user_pool.derbyUserPool.endpoint
    server_side_token_check = false
  }
  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.sveltePoolClient.id
    provider_name           = aws_cognito_user_pool.derbyUserPool.endpoint
    server_side_token_check = false
  }
}
locals {
  awsCognitoSettingsJson = jsonencode({
    "aws_project_region"           = "${data.aws_region.current.name}",
    "aws_cognito_identity_pool_id" = "${aws_cognito_identity_pool.derbyMainIdp.id}",
    "aws_cognito_region"           = "${data.aws_region.current.name}",
    "aws_user_pools_id"            = "${aws_cognito_user_pool.derbyUserPool.id}",
    "aws_user_pools_web_client_id" = "${aws_cognito_user_pool_client.sveltePoolClient.id}",
    "aws_user_pools_hosted_client_id" = aws_cognito_user_pool_client.hosted_client.id,

    "aws_pubsub_region"            = "${data.aws_region.current.name}",
    "aws_pubsub_endpoint"          = "wss://${data.aws_iot_endpoint.mqtt.endpoint_address}/mqtt",
    "oauth"                        = {}
  })

}

data "aws_ssm_parameter" "iot_access_url" {
      name           = "/iot/IotAccessUrl"
}
data "aws_ssm_parameter" "iot_access_key" {
      name           = "/iot/IotAccessKey"
}
resource "local_file" "migrateToAjax" {
  content  = <<-EOT
// WARNING: DO NOT EDIT. This file is automatically generated by terraform  counterfeitAmplifySettings. It will be overwritten.
const awsmobile = ${local.awsCognitoSettingsJson}

export default awsmobile;
  EOT
  filename = "/tmp/migrate-exports-${var.DeployEnvironment}.js"
}


//
//
//

resource "local_file" "counterfeitAmplifySettings" {
//	depends_on = [ aws_cognito_user_pool_domain.derbyUserPool]
  content = jsonencode({
    aws_project_region              = data.aws_region.current.name
    aws_cognito_identity_pool_id    = aws_cognito_identity_pool.derbyMainIdp.id
    aws_cognito_region              = data.aws_region.current.name
    aws_user_pools_id               = aws_cognito_user_pool.derbyUserPool.id
    aws_user_pools_web_client_id    = aws_cognito_user_pool_client.sveltePoolClient.id
    aws_user_pools_hosted_client_id = aws_cognito_user_pool_client.hosted_client.id
    aws_pubsub_region               = data.aws_region.current.name
    aws_pubsub_endpoint             = "wss://${data.aws_iot_endpoint.mqtt.endpoint_address}/mqtt"
    hosted_url                      = "https://${aws_cognito_user_pool_domain.derbyUserPool.domain}.auth.${data.aws_region.current.name}.amazoncognito.com"
    mqtt_ps_url                     = data.aws_ssm_parameter.iot_access_url.value
    mqtt_ps_key                     = data.aws_ssm_parameter.iot_access_key.value
    derby_main_url                  = module.derbyMainLambda.lambda_function_url
    DeployEnvironment               = var.DeployEnvironment
    oauth                           = {}
  })
  filename = "${path.module}/../frontend/src/aws-exports-${var.DeployEnvironment}.json"
}


output "derbyUserPool" {
  value = aws_cognito_user_pool_domain.derbyUserPool.domain
}
output "sveltePoolClient" {
  value     = aws_cognito_user_pool_client.sveltePoolClient
  sensitive = true
}
