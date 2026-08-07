# Repository Security TODO

The repository is public, so everyone can read and fork it, but only authorized
accounts can push to the upstream repository.

## Current state

- [x] Repository visibility is public.
- [x] Default branch is `test.rr1.us`.
- [ ] Review write access for `cwitte4191` and `CoderCCM`.
- [ ] Add branch protection or repository rulesets; none are currently active.
- [ ] Add protection rules and branch policies to the deployment environments;
      none are currently configured.
- [x] Third-party actions in `deploy.yml` are pinned to commit SHAs.

## Recommended changes

### 1. Review repository access

- [ ] Remove or downgrade anyone who should have read-only access. Public access
      already provides read access.
- [ ] Confirm that every remaining organization administrator needs admin access.

### 2. Protect deployment branches

Create an active ruleset for `test.rr1.us`, `stage.rr1.us`, and `go.rr1.us` that:

- [x] Add an idempotent dry-run/apply script:
      [`scripts/configure-github-ruleset.sh`](scripts/configure-github-ruleset.sh).
- [ ] Run the ruleset script with repository administration permission.

- [ ] Requires pull requests.
- [ ] Blocks force pushes.
- [ ] Blocks branch deletion.
- [ ] Add a pull-request validation workflow, then require its automated checks
      before merging. Do not enable required checks until that workflow exists
      and runs reliably on every protected branch.
- [ ] Requires one approval when another trusted reviewer is available.
- [ ] Does not grant broad bypass access.

Reference: [GitHub rulesets documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)

### 3. Protect deployment environments

The deployment workflow has `id-token: write` and can assume AWS roles, so its
environments need controls in addition to branch rules.

- [ ] Add a required reviewer for each live deployment environment.
- [ ] Restrict each deployment environment to its matching branch.
- [ ] Verify that only intended users can dispatch a live deployment.

### 4. Harden organization authentication

- [ ] Require two-factor authentication for organization members and outside
      collaborators.
- [ ] Prefer secure 2FA methods such as passkeys, security keys, authenticator
      applications, or the GitHub mobile application.

Reference: [GitHub organization 2FA documentation](https://docs.github.com/en/organizations/keeping-your-organization-secure/managing-two-factor-authentication-for-your-organization/requiring-two-factor-authentication-for-your-organization)

### 5. Restrict GitHub Actions

- [ ] Set the default workflow token permission to **Read repository contents**.
- [ ] Prevent GitHub Actions from creating or approving pull requests unless a
      specific workflow requires it.
- [ ] Review which external actions are permitted.
- [ ] Continue pinning external actions to full commit SHAs.

### 6. Protect secrets

- [ ] Enable secret scanning.
- [ ] Enable push protection.
- [ ] Review and resolve any existing secret-scanning alerts.

Reference: [GitHub push-protection documentation](https://docs.github.com/en/code-security/concepts/secret-security/push-protection)
