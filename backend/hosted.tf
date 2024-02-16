# __generated__ by Terraform
# Please review these resources and move them into your main configuration files.

# __generated__ by Terraform from "us-west-2_urhuVt8dL/19s5hvhslumvm3uakkhmf7cecc"
resource "aws_cognito_user_pool_client" "hosted_client" {
  access_token_validity                         = 60
  allowed_oauth_flows                           = ["implicit"]
  allowed_oauth_flows_user_pool_client          = true
  allowed_oauth_scopes                          = ["email", "openid", "phone"]
  auth_session_validity                         = 3
  callback_urls                                 = [
	"https://0.0.0.0:8080/",
	"https://localhost:5173/",
	"https://d38fl44wj64v4n.cloudfront.net/",
	"https://waldoNot.test.rr1.us/",
	]
  default_redirect_uri                          = null
  enable_propagate_additional_user_context_data = false
  enable_token_revocation                       = true
  explicit_auth_flows                           = ["ALLOW_CUSTOM_AUTH", "ALLOW_REFRESH_TOKEN_AUTH", "ALLOW_USER_SRP_AUTH"]
  generate_secret                               = null
  id_token_validity                             = 1
  logout_urls                                   = []
  name                                          = "hosted-spa-derby"
  prevent_user_existence_errors                 = "LEGACY"
  read_attributes                               = ["address", "birthdate", "email", "email_verified", "family_name", "gender", "given_name", "locale", "middle_name", "name", "nickname", "phone_number", "phone_number_verified", "picture", "preferred_username", "profile", "updated_at", "website", "zoneinfo"]
  refresh_token_validity                        = 30
  supported_identity_providers                  = ["COGNITO" ]
  #supported_identity_providers                  = ["COGNITO", "Google"]
  user_pool_id                                  = aws_cognito_user_pool.derbyUserPool.id
  write_attributes                              = ["address", "birthdate", "email", "family_name", "gender", "given_name", "locale", "middle_name", "name", "nickname", "phone_number", "picture", "preferred_username", "profile", "updated_at", "website", "zoneinfo"]
  token_validity_units {
    access_token  = "minutes"
    id_token      = "days"
    refresh_token = "days"
  }
}
