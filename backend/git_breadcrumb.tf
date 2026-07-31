
data "external" "git_breadcrumb" {
  program = ["bash", "${path.module}/scripts/gitBreadcrumb.sh"]
}

resource "aws_ssm_parameter" "git_breadcrumb" {
  name = "/deploy/${var.DeployEnvironment}/git-breadcrumb"

  description = "Git branch/hash/dirty breadcrumb for the Terraform deployment"
  type        = "String"
  value = jsonencode({
    branch    = data.external.git_breadcrumb.result.branch
    hash      = data.external.git_breadcrumb.result.hash
    buildTime = data.external.git_breadcrumb.result.buildTime
    dirty     = data.external.git_breadcrumb.result.dirty
  })
}
