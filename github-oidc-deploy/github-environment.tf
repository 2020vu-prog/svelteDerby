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
    readonly terraform_root='${abspath(path.module)}'
    readonly backend_variables_file="$${terraform_root}/backend.auto.tfvars.json"
    backend_config_file="$${1:-$${TF_BACKEND_CONFIG_FILE:-}}"
    variables_file=""
    completed=false

    cleanup() {
      if [[ -n "$${variables_file}" ]]; then
        rm -f -- "$${variables_file}"
      fi
      if [[ "$${completed}" == true ]]; then
        rm -f -- "$0"
      fi
    }
    trap cleanup EXIT

    command -v gh >/dev/null || { echo "GitHub CLI (gh) is required." >&2; exit 1; }
    gh auth status >/dev/null

    if [[ -z "$${backend_config_file}" ]]; then
      read -r -p "Terraform backend config file: " backend_config_file
    fi
    [[ -f "$${backend_config_file}" ]] || { echo "Backend config file not found: $${backend_config_file}" >&2; exit 1; }

    terraform_state_bucket_name="$(sed -nE 's/^[[:space:]]*bucket[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/p' "$${backend_config_file}" | tail -n 1)"
    terraform_lock_table_name="$(sed -nE 's/^[[:space:]]*dynamodb_table[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/p' "$${backend_config_file}" | tail -n 1)"
    [[ -n "$${terraform_state_bucket_name}" ]] || {
      echo "Terraform backend config does not contain a quoted bucket value." >&2
      exit 1
    }

    export TERRAFORM_STATE_BUCKET_NAME="$${terraform_state_bucket_name}"
    export TERRAFORM_LOCK_TABLE_NAME="$${terraform_lock_table_name}"
    export TERRAFORM_DNS_DOMAIN="$${github_environment}"
    python3 - "$${backend_variables_file}" <<'PYTHON'
    import json
    import os
    import sys

    try:
        with open(sys.argv[1], encoding="utf-8") as source:
            values = json.load(source)
    except FileNotFoundError:
        values = {}

    configs = values.setdefault("terraform_backend_configs", {})
    configs[os.environ["TERRAFORM_DNS_DOMAIN"]] = {
        "terraform_state_bucket_name": os.environ["TERRAFORM_STATE_BUCKET_NAME"],
        "terraform_lock_table_name": os.environ["TERRAFORM_LOCK_TABLE_NAME"],
    }
    with open(sys.argv[1], "w", encoding="utf-8") as output:
        json.dump(values, output, indent=2)
        output.write("\n")
    PYTHON
    chmod 600 "$${backend_variables_file}"

    terraform -chdir="$${terraform_root}" apply -auto-approve

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
