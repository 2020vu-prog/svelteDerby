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

## GitHub Deploy

The `Deploy` GitHub Actions workflow deploys the backend first, then builds and
pushes the frontend using the same local scripts used from this repository. It
selects its deployment configuration from the current branch and refuses every
branch that is not explicitly mapped in the workflow.
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

Each GitHub Environment needs:

- `AWS_DEPLOY_ROLE_ARN` environment variable: IAM role ARN trusted by GitHub OIDC.
- `AWS_REGION` environment variable.
- `TF_VAR_MANAGED_ROLE_PERMISSIONS_BOUNDARY_ARN` environment variable: the IAM
  permissions-boundary ARN emitted by `github-oidc-deploy`.
- `TF_BACKEND_CONFIG_FILE` secret: Terraform backend config file contents.
- `GOOGLE_CLIENT_ID` secret.
- `GOOGLE_CLIENT_SECRET` secret.

Required GitHub environment variables:

- `TF_VAR_ACM_ARN`
- `TF_VAR_DNS_DOMAIN`
- `TF_VAR_DNS_CLOUDFRONT_HOST_ALIAS`
- `TF_VAR_TIMER_API_GATEWAY_DOMAIN`

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
