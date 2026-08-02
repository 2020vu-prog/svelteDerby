# GitHub OIDC Deploy Role

This Terraform root creates the AWS IAM role used by the `Deploy` GitHub Actions
workflow. It uses GitHub OIDC, so the workflow does not need long-lived AWS
access keys.

Each role trust policy is intentionally narrow. Configure one root per deployment
branch, with its GitHub Environment as the allowed subject:

```text
test.rr1.us  -> repo:2020vu-prog/svelteDerby:environment:test.rr1.us
stage.rr1.us -> repo:2020vu-prog/svelteDerby:environment:stage.rr1.us
go.rr1.us    -> repo:2020vu-prog/svelteDerby:environment:go.rr1.us
```

## Bootstrap

Apply this directory with local AWS credentials that are allowed to manage IAM:

```bash
cd github-oidc-deploy
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform apply
```

Then copy the `deploy_role_arn` output into the GitHub environment variable
named `AWS_DEPLOY_ROLE_ARN`.
Copy `managed_role_permissions_boundary_arn` into the matching GitHub Environment
variable named `TF_VAR_MANAGED_ROLE_PERMISSIONS_BOUNDARY_ARN`.

The workflow also expects these GitHub environment values:

- `TF_BACKEND_CONFIG_FILE` secret, containing the Terraform backend config file.
- `GOOGLE_CLIENT_ID` secret.
- `GOOGLE_CLIENT_SECRET` secret.

Protect each GitHub Environment with required reviewers and deployment branch rules.
The workflow accepts only these checked-in branch mappings:

```text
test.rr1.us  -> test.rr1.us  -> derbyTest
stage.rr1.us -> stage.rr1.us -> derbyStage
go.rr1.us    -> go.rr1.us    -> go-derby-prod
```

Create the permissions boundary with the first role root. For the stage and
production roots, set `create_managed_role_permissions_boundary = false` and
provide that first output as `existing_managed_role_permissions_boundary_arn`.

## Existing OIDC Provider

An AWS account can only have one OIDC provider for
`token.actions.githubusercontent.com`. If one already exists, set:

```hcl
create_oidc_provider       = false
existing_oidc_provider_arn = "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
```

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

Tighten these values when known:

- `terraform_state_bucket_name`
- `terraform_lock_table_name`
- `hosted_zone_arns`
