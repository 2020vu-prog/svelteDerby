# GitHub OIDC Deploy Role

This Terraform root creates the AWS IAM role used by the `Deploy` GitHub Actions
workflow. It uses GitHub OIDC, so the workflow does not need long-lived AWS
access keys.

Each role trust policy is intentionally narrow. Each deployment environment uses
a separate AWS account. Apply this root independently in each account, with the
matching GitHub Environment as the allowed subject:

```text
test.rr1.us  -> repo:2020vu-prog/svelteDerby:environment:test.rr1.us
stage.rr1.us -> repo:2020vu-prog/svelteDerby:environment:stage.rr1.us
go.rr1.us    -> repo:2020vu-prog/svelteDerby:environment:go.rr1.us
```

## Bootstrap

For each environment, select local AWS credentials for that environment's AWS
account and use separate Terraform state. Then apply this directory with
credentials that are allowed to manage IAM:

```bash
cd github-oidc-deploy
cp terraform.tfvars.example terraform.tfvars
terraform init
export TF_BACKEND_CONFIG=/private/path/test.backend.hcl
terraform apply
```

The GitHub Environment name is derived automatically from `DnsDomain`. For
example, `DnsDomain = "test.rr1.us"` makes the IAM OIDC subject and generated
GitHub CLI setup script both target the `test.rr1.us` GitHub Environment.
`DeployEnvironment` remains the separate application environment name, such as
`derbyTest`.

This repository customizes its GitHub OIDC subject with immutable owner and
repository IDs. Keep `github_owner_id` and `github_repo_id` aligned with the
values in the decoded GitHub token. For this repository, the resulting test
subject is:

```text
repo:2020vu-prog@265285298/svelteDerby@1316526362:environment:test.rr1.us
```

The apply reads the application Terraform backend configuration from the file
named by the required `TF_BACKEND_CONFIG` environment variable. It uses the state bucket and optional
`dynamodb_table` names while building the deploy policy. After the AWS resources
are ready, Terraform generates and automatically invokes an executable whose
filename includes `DnsDomain`, for example
`.tmp/configure-github-test.rr1.us.sh`.

Authenticate the GitHub CLI and provide the Google credentials before applying
for a fully non-interactive run:

```bash
gh auth status
export TF_BACKEND_CONFIG=/private/path/test.backend.hcl
export TF_VAR_AppShortName=Test.RR1
export TF_VAR_GoogleClientId=...
export TF_VAR_GoogleClientSecret=...
terraform apply
```

The script creates the GitHub Environment if needed and uploads all required
variables and uploads the backend configuration as a multiline secret. It
prompts for the Google client ID and secret when they are not already present in
the environment, and removes its temporary dotenv file after a successful run.
You can provide the Google values non-interactively through local
`TF_VAR_GoogleClientId` and
`TF_VAR_GoogleClientSecret` environment variables. Their values are never
passed through Terraform or stored in Terraform state.

The generated executable remains in the gitignored `.tmp` directory so
Terraform can track it without introducing filesystem drift. It can still be
run manually when GitHub values need to be refreshed without changing AWS
resources:

```bash
"$(terraform output -raw github_environment_setup_script)"
```

The generated script configures:

- `AWS_DEPLOY_ROLE_ARN` variable.
- `AWS_REGION` variable.
- `TF_VAR_DeployEnvironment` variable.
- `TF_VAR_AppShortName` variable.
- `TF_VAR_ManagedRolePermissionsBoundaryArn` variable.
- `TF_VAR_AcmArn` variable.
- `TF_VAR_DnsDomain` variable.
- `TF_VAR_DnsCloudfrontHostAlias` variable.
- `TF_VAR_TimerApiGatewayDomain` variable.
- `TF_BACKEND_CONFIG_FILE_CONTENTS` secret, containing the Terraform backend
  config file contents.
- `TF_VAR_GoogleClientId` secret.
- `TF_VAR_GoogleClientSecret` secret.

Protect each GitHub Environment with required reviewers and deployment branch rules.
The workflow accepts only these checked-in branch mappings:

```text
test.rr1.us  -> test.rr1.us  -> derbyTest
stage.rr1.us -> stage.rr1.us -> derbyStage
go.rr1.us    -> go.rr1.us    -> go-derby-prod
```

Create a permissions boundary independently in every environment account. A
permissions boundary from one AWS account cannot be attached to a role in
another account. Leave `create_managed_role_permissions_boundary = true` for
each account unless that same account already contains the intended boundary;
in that case, set it to `false` and provide the account-local boundary ARN as
`existing_managed_role_permissions_boundary_arn`.

## Existing OIDC Provider

Every environment account needs a GitHub Actions OIDC provider. An AWS account
can only have one provider for `token.actions.githubusercontent.com`, so this
root reuses an existing provider by default. If the current environment's
account does not have one, set:

```hcl
create_oidc_provider = true
```

When reusing a provider, Terraform derives its ARN from the current AWS account
ID and partition. The existing provider remains separate from the deployment
role that this root creates.

## Permission Scope

The deploy policy is scoped to the services/resources used by the backend
Terraform and frontend S3 upload path. IAM roles created by the application
Terraform must carry the emitted permissions boundary; that prevents the deploy
role from escalating a managed runtime role through an arbitrary role policy.

The legacy Android IAM user/access-key resources are deliberately read-only to
the workflow. Create or rotate that key with a separately authorized maintenance
process, not CI.

The VOD CloudFormation stack is also read-only to the workflow because its
template creates IAM roles. Change that stack through a separately reviewed,
more narrowly scoped maintenance role.

Terraform reads backend resource names from `TF_BACKEND_CONFIG`. Direct
`terraform_state_bucket_name`, `terraform_lock_table_name`, and
`terraform_backend_configs` inputs remain available as higher-precedence
overrides.
- `hosted_zone_arns`
