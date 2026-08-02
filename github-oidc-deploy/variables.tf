variable "aws_region" {
  description = "AWS region where the deploy role is managed."
  type        = string
  default     = "us-east-2"
}

variable "github_owner" {
  description = "GitHub organization or user that owns the repository."
  type        = string
  default     = "2020vu-prog"
}

variable "github_repo" {
  description = "GitHub repository name."
  type        = string
  default     = "svelteDerby"
}

variable "github_environment" {
  description = "GitHub Environment name allowed to assume this role."
  type        = string
  default     = "derbyTest"
}

variable "role_name" {
  description = "Name for the GitHub Actions deploy role."
  type        = string
  default     = "svelte-derby-github-deploy"
}

variable "managed_role_permissions_boundary_name" {
  description = "Name of the permissions boundary attached to IAM roles managed by the application Terraform."
  type        = string
  default     = "svelte-derby-managed-role-boundary"
}

variable "create_managed_role_permissions_boundary" {
  description = "Create the runtime permissions boundary. Set false for additional deploy roles that reuse the first boundary."
  type        = bool
  default     = true
}

variable "existing_managed_role_permissions_boundary_arn" {
  description = "Existing runtime permissions-boundary ARN, required when create_managed_role_permissions_boundary is false."
  type        = string
  default     = ""
}

variable "deploy_environment" {
  description = "Application deployment environment used in SSM paths."
  type        = string
  default     = "derbyTest"
}

variable "create_oidc_provider" {
  description = "Create the GitHub Actions OIDC provider. Set false if the AWS account already has one."
  type        = bool
  default     = true
}

variable "existing_oidc_provider_arn" {
  description = "Existing GitHub Actions OIDC provider ARN, required when create_oidc_provider is false."
  type        = string
  default     = ""
}

variable "github_oidc_thumbprints" {
  description = "Thumbprints for token.actions.githubusercontent.com."
  type        = list(string)
  default     = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

variable "terraform_state_bucket_name" {
  description = "Optional Terraform backend state bucket name for this app."
  type        = string
  default     = ""
}

variable "terraform_lock_table_name" {
  description = "Optional Terraform backend DynamoDB lock table name."
  type        = string
  default     = ""
}

variable "hosted_zone_arns" {
  description = "Optional Route53 hosted zone ARNs Terraform may update."
  type        = list(string)
  default     = []
}
