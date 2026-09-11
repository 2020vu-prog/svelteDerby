locals {
  github_environment_script_path = "${path.module}/.tmp/configure-github-${var.DnsDomain}.sh"
}

resource "local_file" "github_environment_script" {
  filename        = local.github_environment_script_path
  file_permission = "0700"

  content = <<-SCRIPT
    #!/usr/bin/env bash
    set -euo pipefail

    readonly github_repo='${var.github_owner}/${var.github_repo}'
    readonly github_environment='${local.github_environment}'
    readonly backend_config_file="$${TF_BACKEND_CONFIG:-}"
    variables_file=""
    completed=false

    cleanup() {
      if [[ -n "$${variables_file}" ]]; then
        rm -f -- "$${variables_file}"
      fi
      if [[ "$${completed}" == true && "$${KEEP_GENERATED_GITHUB_SCRIPT:-false}" != true ]]; then
        rm -f -- "$0"
      fi
    }
    trap cleanup EXIT

    command -v gh >/dev/null || { echo "GitHub CLI (gh) is required." >&2; exit 1; }
    gh auth status >/dev/null

    if [[ -z "$${backend_config_file}" ]]; then
      echo "TF_BACKEND_CONFIG must name the Terraform backend config file." >&2
      exit 1
    fi
    [[ -f "$${backend_config_file}" ]] || { echo "Backend config file not found: $${backend_config_file}" >&2; exit 1; }

    if [[ -z "$${TF_VAR_GoogleClientId:-}" ]]; then
      read -r -p "Google client ID: " TF_VAR_GoogleClientId
    fi
    if [[ -z "$${TF_VAR_GoogleClientSecret:-}" ]]; then
      read -r -s -p "Google client secret: " TF_VAR_GoogleClientSecret
      echo
    fi

    if ! gh api "repos/$${github_repo}/environments/$${github_environment}" >/dev/null 2>&1; then
      gh api --method PUT "repos/$${github_repo}/environments/$${github_environment}" >/dev/null
    fi

    variables_file="$(mktemp "$${TMPDIR:-/tmp}/svelte-derby-github-vars.XXXXXX")"
    chmod 600 "$${variables_file}"
    cat >"$${variables_file}" <<'VARIABLES'
    AWS_DEPLOY_ROLE_ARN=${aws_iam_role.github_deploy.arn}
    AWS_REGION=${var.AwsRegion}
    TF_VAR_DeployEnvironment=${var.DeployEnvironment}
    TF_VAR_AppShortName=${var.AppShortName}
    TF_VAR_ManagedRolePermissionsBoundaryArn=${local.managed_role_permissions_boundary_arn}
    TF_VAR_AcmArn=${var.AcmArn}
    TF_VAR_DnsDomain=${var.DnsDomain}
    TF_VAR_DnsCloudfrontHostAlias=${var.DnsCloudfrontHostAlias}
    TF_VAR_TimerApiGatewayDomain=${var.TimerApiGatewayDomain}
    VARIABLES

    gh variable set --repo "$${github_repo}" --env "$${github_environment}" --env-file "$${variables_file}"
    printf '%s' "$${TF_VAR_GoogleClientId}" | gh secret set TF_VAR_GoogleClientId --repo "$${github_repo}" --env "$${github_environment}"
    printf '%s' "$${TF_VAR_GoogleClientSecret}" | gh secret set TF_VAR_GoogleClientSecret --repo "$${github_repo}" --env "$${github_environment}"
    gh secret set TF_BACKEND_CONFIG_FILE_CONTENTS --repo "$${github_repo}" --env "$${github_environment}" < "$${backend_config_file}"

    completed=true
    echo "Configured GitHub Environment $${github_environment} in $${github_repo}."
  SCRIPT
}

resource "null_resource" "configure_github_environment" {
  triggers = {
    script_sha256         = sha256(local_file.github_environment_script.content)
    backend_config_sha256 = data.external.terraform_backend_config.result.sha256
  }

  provisioner "local-exec" {
    command     = local_file.github_environment_script.filename
    interpreter = ["/usr/bin/env", "bash"]

    environment = {
      KEEP_GENERATED_GITHUB_SCRIPT = "true"
    }
  }

  depends_on = [aws_iam_role_policy_attachment.deploy]
}
