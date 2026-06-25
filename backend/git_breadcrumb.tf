terraform {
  required_providers {
    external = {
      source  = "hashicorp/external"
      version = "~> 2.3"
    }
  }
}

data "external" "git_breadcrumb" {
  program = ["bash", "${path.module}/scripts/gitBreadcrumb.sh"]
}

resource "aws_ssm_parameter" "git_breadcrumb" {
  name = "/deploy/${var.DeployEnvironment}/git-breadcrumb"

  description = "Git branch/hash/dirty breadcrumb for the Terraform deployment"
  type        = "String"
  value       = data.external.git_breadcrumb.result.breadcrumb
}
