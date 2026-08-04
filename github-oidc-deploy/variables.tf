variable "aws_region" {
  description = "AWS region where the deploy role is managed."
  type        = string
  default     = "us-east-2"
}

variable "github_owner" {
  description = "GitHub organization or user that owns the repository."
  type        = string
  default     = "2020vu-prog"

  validation {
    condition     = can(regex("^[A-Za-z0-9_.-]+$", var.github_owner))
    error_message = "github_owner may contain only letters, digits, underscores, dots, and hyphens."
  }
}

variable "github_repo" {
  description = "GitHub repository name."
  type        = string
  default     = "svelteDerby"

  validation {
    condition     = can(regex("^[A-Za-z0-9_.-]+$", var.github_repo))
    error_message = "github_repo may contain only letters, digits, underscores, dots, and hyphens."
  }
}

variable "github_environment" {
  description = "GitHub Environment name allowed to assume this role."
  type        = string
  default     = "derbyTest"

  validation {
    condition     = can(regex("^[A-Za-z0-9_.-]+$", var.github_environment))
    error_message = "github_environment may contain only letters, digits, underscores, dots, and hyphens."
  }
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

variable "dns_domain" {
  description = "Deployment DNS domain; also used in the generated GitHub setup script filename."
  type        = string

  validation {
    condition     = can(regex("^[A-Za-z0-9][A-Za-z0-9.-]*[A-Za-z0-9]$", var.dns_domain))
    error_message = "dns_domain must be a DNS name containing only letters, digits, dots, and hyphens."
  }
}

variable "acm_arn" {
  description = "ACM certificate ARN passed to the application Terraform."
  type        = string

  validation {
    condition     = can(regex("^[A-Za-z0-9:/_-]+$", var.acm_arn))
    error_message = "acm_arn must be a non-empty ACM ARN."
  }
}

variable "dns_cloudfront_host_alias" {
  description = "CloudFront hostname prefix passed to the application Terraform."
  type        = string
  default     = "cf"

  validation {
    condition     = can(regex("^[A-Za-z0-9-]+$", var.dns_cloudfront_host_alias))
    error_message = "dns_cloudfront_host_alias must be a DNS label."
  }
}

variable "timer_api_gateway_domain" {
  description = "Legacy timer API Gateway hostname passed to the application Terraform."
  type        = string
  default     = "cfxgbxl7d9.execute-api.us-east-2.amazonaws.com"

  validation {
    condition     = can(regex("^[A-Za-z0-9][A-Za-z0-9.-]*[A-Za-z0-9]$", var.timer_api_gateway_domain))
    error_message = "timer_api_gateway_domain must be a DNS hostname."
  }
}

variable "create_oidc_provider" {
  description = "Create the GitHub Actions OIDC provider. Set true only if the AWS account does not already have one."
  type        = bool
  default     = false
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
