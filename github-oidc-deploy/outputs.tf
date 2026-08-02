output "deploy_role_arn" {
  description = "Set this as the AWS_DEPLOY_ROLE_ARN GitHub environment variable."
  value       = aws_iam_role.github_deploy.arn
}

output "managed_role_permissions_boundary_arn" {
  description = "Set this as the TF_VAR_MANAGED_ROLE_PERMISSIONS_BOUNDARY_ARN GitHub environment variable."
  value       = local.managed_role_permissions_boundary_arn
}

output "github_oidc_subject" {
  description = "GitHub OIDC subject allowed to assume the deploy role."
  value       = local.github_subject
}

output "oidc_provider_arn" {
  description = "GitHub Actions OIDC provider ARN used by the role trust policy."
  value       = local.oidc_provider_arn
}
