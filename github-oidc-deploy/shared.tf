provider "aws" {
  region = var.AwsRegion
}

data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

locals {
  account_id                            = data.aws_caller_identity.current.account_id
  partition                             = data.aws_partition.current.partition
  github_oidc_url                       = "https://token.actions.githubusercontent.com"
  github_oidc_host                      = "token.actions.githubusercontent.com"
  existing_oidc_provider_arn            = "arn:${local.partition}:iam::${local.account_id}:oidc-provider/${local.github_oidc_host}"
  github_environment                    = var.DnsDomain
  github_subject                        = "repo:${var.github_owner}@${var.github_owner_id}/${var.github_repo}@${var.github_repo_id}:environment:${local.github_environment}"
  oidc_provider_arn                     = var.create_oidc_provider ? aws_iam_openid_connect_provider.github_actions[0].arn : local.existing_oidc_provider_arn
  managed_role_permissions_boundary_arn = var.create_managed_role_permissions_boundary ? aws_iam_policy.managed_role_boundary[0].arn : var.existing_managed_role_permissions_boundary_arn

  app_bucket_arns = [
    "arn:${local.partition}:s3:::svelte-static-*",
    "arn:${local.partition}:s3:::svelte-cdn-logs*",
    "arn:${local.partition}:s3:::derby-dst-bucket*",
    "arn:${local.partition}:s3:::vod-lambda-src-*",
  ]

  state_bucket_arns = var.terraform_state_bucket_name == "" ? [] : [
    "arn:${local.partition}:s3:::${var.terraform_state_bucket_name}",
  ]

  s3_bucket_arns = concat(local.app_bucket_arns, local.state_bucket_arns)
  s3_object_arns = [for arn in local.s3_bucket_arns : "${arn}/*"]

  terraform_lock_table_arns = var.terraform_lock_table_name == "" ? [] : [
    "arn:${local.partition}:dynamodb:${var.AwsRegion}:${local.account_id}:table/${var.terraform_lock_table_name}",
  ]
}
