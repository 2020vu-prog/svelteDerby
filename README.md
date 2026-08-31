# svelteDerby

Race management software for soapbox derby events. The repo includes a Svelte
frontend, AWS-backed event services, timer ingestion, media/video support, and
Discord/Zello-related helper services.

## Repository Layout

- `frontend/` - Svelte single-page app built with webpack.
- `backend/` - Terraform, Lambda code, DynamoDB helpers, Cognito config, and
  backend test harnesses.
- `backend/modules/lambdaDerby/src/` - Main derby API Lambda code.
- `backend/test/` - Backend unit and integration tests.
- `discord/` - Discord notification/support infrastructure and Go Lambdas.
- `raceArchive/` - Archived race/event data.
- `rr1.us/` - Static/site support files.

## Frontend

Install and run the local development server:

```bash
cd frontend
npm install
npm run dev
```

The app is normally tested locally at:

```text
https://0.0.0.0:8080/
```

That URL matters for Cognito callback configuration. Local development uses
self-signed certificates, so browsers may require a manual certificate warning
bypass.

Build production frontend assets:

```bash
cd frontend
npm run build
```

## Formatting and VS Code

VS Code users should install the recommended **Prettier - Code formatter** and
**HashiCorp Terraform** extensions. VS Code will offer these recommendations
automatically when opening the repository.

Install the repository-pinned Prettier version and Svelte plugin before
formatting:

```bash
cd frontend
npm ci
cd ..
```

Run the repository formatting commands from the repository root:

```bash
./prettier.sh                   # Format all tracked JS, MJS, and Svelte files
./prettier.sh --check           # Check formatting without changing files
terraform fmt -recursive .      # Format all Terraform files
terraform fmt -check -recursive . # Check Terraform formatting
```

The pull-request formatting workflow uses these same commands. Use the
repository scripts instead of a globally installed Prettier so formatting uses
the pinned Prettier version and the explicitly configured Svelte plugin. The
repository does not enforce VS Code format-on-save settings.

## GitHub Deploy

The `Deploy` GitHub Actions workflow deploys the backend first, then builds and
pushes the frontend using the same local scripts used from this repository. It
automatically deploys pushes to `test.rr1.us`. Successful stage and production
promotions dispatch the same workflow in live mode for the promoted environment.
Manual runs default to `dry-run`, which tests and plans the backend and builds
the frontend without changing AWS. Select `live` in the workflow dispatch form
to apply the saved Terraform plan and upload the built frontend.
It uses GitHub OIDC to assume an AWS role; do not add long-lived AWS access keys
to GitHub secrets.

Configure a GitHub Environment for each mapped deployment branch:

```text
test.rr1.us  -> test.rr1.us  -> derbyTest
stage.rr1.us -> stage.rr1.us -> derbyStage
go.rr1.us    -> go.rr1.us    -> go-derby-prod
```

Each deployment environment uses a separate AWS account. Run the
`github-oidc-deploy` Terraform root independently in each account with separate
Terraform state. Each account needs its own deploy role and permissions boundary,
plus a GitHub Actions OIDC provider unless that account already has one.
That Terraform root generates a temporary, DNS-domain-named shell script that
uses GitHub CLI to configure the following values for the matching Environment.

The `github-oidc-deploy` root derives the GitHub Environment automatically from
`DnsDomain`. For test, these values are:

```hcl
DnsDomain         = "test.rr1.us"
DeployEnvironment = "derbyTest"
```

The derived name is used in both the AWS OIDC trust policy and the generated
script's `gh variable set --env`/`gh secret set --env` commands, keeping the role
trust and uploaded GitHub configuration aligned.

The repository's customized GitHub OIDC subject also includes its immutable
owner ID (`265285298`) and repository ID (`1316526362`). These are configured by
`github_owner_id` and `github_repo_id` in `github-oidc-deploy`.

When run with the private application backend HCL file, the generated setup
script extracts its S3 state bucket and optional DynamoDB lock table and reapplies
`github-oidc-deploy` with those values. This keeps the deploy role's state access
aligned with the backend secret without duplicating private configuration.

Each GitHub Environment needs:

- `AWS_DEPLOY_ROLE_ARN` environment variable: IAM role ARN trusted by GitHub OIDC.
- `AWS_REGION` environment variable.
- `TF_VAR_DeployEnvironment` environment variable.
- `TF_VAR_ManagedRolePermissionsBoundaryArn` environment variable: the IAM
  permissions-boundary ARN emitted by `github-oidc-deploy`.
- `TF_BACKEND_CONFIG_FILE_CONTENTS` secret: Terraform backend config file contents.
- `TF_VAR_GoogleClientId` secret.
- `TF_VAR_GoogleClientSecret` secret.

Required GitHub environment variables:

- `TF_VAR_AcmArn`
- `TF_VAR_DnsDomain`
- `TF_VAR_DnsCloudfrontHostAlias`
- `TF_VAR_TimerApiGatewayDomain`

Protect each GitHub Environment with required reviewers and an exact deployment
branch rule. The workflow checks out and deploys the selected workflow revision,
so the environment protection is the approval boundary for AWS access.

## Backend

Backend infrastructure is managed with Terraform under `backend/`. Copy
`backend/awsVarTemplate.sh` to a private location outside the repository, fill
in environment-specific values, source it, then run Terraform from `backend/`:

```bash
cd backend
terraform init
terraform apply
```

Do not commit generated AWS exports, credentials, OAuth secrets, test env files,
or local Terraform state.

## Tests

Run backend unit tests:

```bash
cd backend/test
npm install
npm run test:unit
```

Run backend integration tests:

```bash
cd backend/test
npm run integration
```

Integration tests require local, uncommitted configuration and credentials for a
dedicated low-privilege test user.

## Secrets

This repository is intended to be safe for public hosting. Keep secrets in local
files, environment variables, AWS SSM/Secrets Manager, or private Terraform var
files. In particular, never commit:

- Cognito/OAuth client secrets.
- Discord bot tokens.
- AWS credentials or generated AWS config.
- Local integration-test credentials.
- Personal email/permission seed files.

Known local-only files are covered by `.gitignore`; add new sensitive local
files there before using them.
