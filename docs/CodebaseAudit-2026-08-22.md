# svelteDerby Codebase Audit

Date: 2026-08-22
Scope: full repo (frontend, backend/Terraform/Lambda, discord Go services, CI/CD) — security, dependencies, code quality/architecture, per your request.
Branch reviewed: `codex/ffmpeg-lambda-pilot` (local checkout); default branch is `test.rr1.us`.

## How this was done

The repo was inspected in place (no data left behind): directory structure, git history, Terraform IAM policies, Lambda/API auth code, permission logic, CI workflows, and `package.json`/`package-lock.json` files across all nine Node packages. `npm audit` could not reach `registry.npmjs.org` from this sandbox (network egress blocked), so the dependency section is based on manual version review, not a live CVE feed — run `npm audit` locally or in CI for authoritative, current results.

You already have `TODO.md` tracking repo/org-level security items (branch protection, 2FA, secret scanning). This audit doesn't repeat those; it covers what's inside the code and infrastructure instead.

---

## Summary

The codebase is in noticeably better shape than the median hobby project of this size: no hardcoded secrets found, JWTs are properly signature-verified against Cognito (not just decoded), authorization is looked up server-side from the authenticated email rather than trusted from the client, and DynamoDB queries use parameterized expressions throughout. Recent commit history (#52–#67) shows active, deliberate paydown of exactly the kind of tech debt this audit would otherwise flag — permission/routing centralization, formatting enforcement, guarded environment promotion.

The findings below are concentrated in three places: one over-privileged IAM role, one broken/dead dependency reference, and CI that only validates code when someone remembers to run it manually.

---

## Security

### High

**1. Discord bot's EC2 role has account-wide Secrets Manager access** — `discord/iam.tf:63`
The `discord_bot_ec2_role` policy grants `"secretsmanager:*"` on `"Resource": "*"`, alongside unscoped `ssm:GetParameters` and `autoscaling:SetDesiredCapacity`. This is an IAM role attached to a running EC2 instance (the Discord bot host). If that instance or the bot process running on it is ever compromised, the attacker inherits read/write/delete on *every* secret in the AWS account — not just whatever the bot itself needs. Scope this to the specific secret ARN(s) the bot reads (e.g. `arn:aws:secretsmanager:*:*:secret:discord-bot/*`) and drop the `ssm`/`autoscaling` actions to the specific parameter paths / ASG the bot manages.

**2. `lambdaDerby` depends on a path outside the repository** — `backend/modules/lambdaDerby/src/package.json:37`
```
"timer_protobuf": "file:../../../scratch509/modules/timer_protobuf"
```
This resolves three directories above `lambdaDerby/src` — outside `svelteDerby` entirely, into a sibling folder (`scratch509`) that only exists on whoever's machine originally added this. It's present in both `package.json` and `package-lock.json`, so `npm ci` will fail with `ENOENT` on any fresh clone or CI runner that lacks that exact sibling directory. Checked usage: every reference to `timer_protobuf` inside `derbyMain.js` is already commented out (lines 14–19, 866–867), so the dependency is dead code — the fix is to delete it from `package.json`/`package-lock.json`, not to relocate it. Worth confirming `deploy.yml`'s `npm ci` step for `lambdaDerby` is actually succeeding on a real runner right now.

### Medium

**3. IoT device policies grant pub/sub on every topic, not just the device's own** — `backend/s3VideoUser.tf:55,77`, `backend/cognitoRole.tf:86`
`GrafikaSubToAnyTopic`, `RpiPubToAnyTopic`, and `SubToAnyTopic` all use `"Resource": "*"` for `iot:Publish`/`Subscribe`/`Connect`/`Receive`. These are attached to individual device certificates (e.g. `grafika_cert`), so a compromised or cloned device credential can publish or eavesdrop on any topic in the account — including other devices' or other events' race-timing data. IoT policies support ARN wildcards scoped to a topic prefix (`arn:aws:iot:region:account:topic/derby/${iot:Connection.Thing.ThingName}/*`); scoping to that would contain the blast radius per device.

**4. `github-oidc-deploy` deploy policy has many `resources = ["*"]` statements** — `github-oidc-deploy/deploy-policy.tf` (11 occurrences)
This is the role GitHub Actions assumes via OIDC to run Terraform. Broad resource scoping here is more defensible than the two findings above — the role is bounded by a permissions boundary (per your README) and only reachable from a protected GitHub Environment — but it's worth a pass to confirm the permissions boundary actually constrains every one of those `*` statements to the intended account/resource types, since a permissions boundary that's looser than expected would make this the highest-value target in the whole deployment chain.

### Low

**5. S3 upload bucket CORS allows any origin with PUT/POST/DELETE** — `backend/dynamo.tf:135-152`
`aws_s3_bucket_cors_configuration.dstBucket` sets `allowed_origins = ["*"]` for `GET/PUT/POST/DELETE`. If uploads go through presigned URLs (authorization enforced by the signature, not by CORS), this is standard practice and fine. Worth a quick confirmation that's actually how it's used, since a wildcard CORS policy on a bucket that accepted un-signed browser requests would be a real problem.

**6. `axios` pinned to `0.21.4` in `backend/timerIngestion`** — `backend/timerIngestion/package-lock.json`
0.21.4 predates the fix for the SSRF/credential-leak-on-redirect issue (CVE-2023-45857, fixed in 1.6.0) and several later axios advisories. This package isn't obviously exposed to attacker-controlled URLs from what was reviewed, but it's cheap to bump — worth checking whether anything in `timerIngestion` constructs request URLs from external input.

### What's solid (worth knowing, not just what's wrong)

- Cognito ID tokens are verified with `aws-jwt-verify`'s `CognitoJwtVerifier`, configured with the correct user pool ID, client ID, and `tokenUse: "id"` — real signature verification, not a decode-only shortcut (`backend/modules/lambdaDerby/src/derbyMain.js:6`).
- Authorization (`authorizeApiRequest`) checks permissions against a role list fetched server-side via `getUserRoles(orgIz, principal.email)` — the client never gets to assert its own roles.
- Permission definitions (`RoutePermission`) are a single frozen source of truth imported by both frontend and backend (`frontend/src/routes/routePermission.js` re-exports the backend module directly), so there's no drift between what the UI shows and what the API enforces.
- DynamoDB access in `DdbUtils.js` uses parameterized `KeyConditionExpression`/`FilterExpression` with `ExpressionAttributeValues` throughout — no string-built query injection risk found.
- No hardcoded credentials, API keys, or private keys found anywhere in source (the only regex hits were an empty credentials template and a `read -s` prompt for a secret — both correct patterns).

---

## Dependencies

`npm audit` couldn't run against the real registry from this environment (sandboxed egress). Based on manual review of all nine `package-lock.json` files:

- **`axios`**: `0.21.4` in `backend/timerIngestion` (see Security §6 above); `1.19.0` in `frontend` and `backend/test`, pinned with no `^`, so it won't pick up patch releases — including security fixes — without a manual bump.
- **`ws`**: mixed `7.5.x` and `8.21.x` across lockfiles. `ws` before `8.17.1` has a DoS advisory (unbounded header parsing); the 7.x instances are transitive (via `serverless`/tooling) rather than runtime-exposed, but worth confirming none of them run as an actual listening server.
- **Go modules** (`discord/src/sns/go.mod`, `discord/src/airhorn/go.mod`): both declare `go 1.16`, a language version from 2021. `discordgo` is pinned to `v0.26.1`. Not urgent, but worth bumping the toolchain version at some point since 1.16 has been out of Go's own support window for years.
- **`svelte`**: `^3.59.2` — two major versions behind current. Not a vulnerability, but every new Svelte ecosystem package increasingly assumes v5, so this gap will only get more expensive to close.
- Everything else reviewed (`jsonwebtoken 9.0.x`, `aws-jwt-verify 4.0.1`, `minimist 1.2.8`, `braces`, `cross-spawn`, `follow-redirects`, `qs`) is on patched, current-ish versions.

Recommendation: run `npm audit --omit=dev` in each of the nine Node packages from a machine with real registry access (or add it as a CI step) for a definitive, current vulnerability list — this section is a version-currency review, not a substitute for that.

---

## Code quality & architecture

**`derbyMain.js` is a 2,205-line monolith** (`backend/modules/lambdaDerby/src/derbyMain.js`) — routing table, auth, and business logic for every domain (timing, IoT, announcements, org management) in one file. It's the largest file in the repo by a wide margin (the next largest backend file is 936 lines). This isn't broken, but it's the file every future change has to navigate, and it's the one place a routing bug or auth regression is most likely to hide. Splitting by domain (timing, IoT, org/roles, announcements) behind the existing `routeMap` would make each piece independently testable.

**Dead file**: `frontend/src/TimerPbAlignmentWipTypescriptProbs.svelte` (566 lines) is not imported anywhere in `frontend/src` — confirmed via grep. It sits next to the file it's presumably a WIP fork of, `TimerPbAlignment.svelte` (610 lines). Either finish and swap it in, or delete it — right now it's 566 lines of maintenance surface (and reader confusion) for nothing.

**CI only validates code when someone remembers to run it** — `.github/workflows/deploy.yml` triggers on `workflow_dispatch` only. The unit test suite (13 files under `backend/test/`, including `apiRouter.test.js`, `permissionLookup.test.js`, `auth.test.js`) is real and does run — but only as a step inside a manually-dispatched deploy, never automatically on a pushed commit or opened PR. `format.yml` does run on `pull_request`, but it only checks Prettier/Terraform formatting, not tests. A logic regression can merge to any branch without ever being tested by CI. This is the same gap your own `TODO.md` already flags ("Add a pull-request validation workflow... before merging") — this audit corroborates it as the single highest-leverage process fix available.

**No static analysis beyond formatting**: the repo has a `.prettierrc` and enforces it in CI, but no ESLint (or equivalent) config anywhere. Prettier catches style, not bugs — unused variables, unreachable code (see next item), and accidental globals currently have no automated check.

**Minor: unreachable code** — `getOrgRoles()` in `derbyMain.js` (~line 1187) has a `return { statusCode: 403, ... }` statement placed *after* an unconditional `return` a few lines above it, making the 403 branch permanently dead. Functionally harmless today (the earlier return already fails safe — empty role list, not elevated access) but it's a sign the function's control flow doesn't say what it looks like it says; worth a quick cleanup so a future edit doesn't "restore" logic that was never reachable.

**Stale doc reference**: `TODO.md`'s "Authorization consistency backlog" links to `docs/PermissionAuthorizationPlan.md` — that file doesn't exist in the repo. Either it was never committed or was removed after the linked work (permission/routing centralization, commits #53–#57) already landed. Worth either writing it or removing the dead link so the backlog item isn't pointing at nothing.

**Positive**: the git log shows this is already an active area of investment, not neglect — recent commits explicitly centralize permissions and routing (#53, #54), format the whole codebase (#52), and guard environment promotion (#66, #67). The monolith-file and CI-gating findings above are the natural next steps in that same direction, not a departure from it.

---

## Suggested priority order

1. Scope down the Discord bot's `secretsmanager:*` / `ssm:*` IAM grant to the specific secret(s) it needs (Security #1) — highest blast-radius-per-effort fix in this list.
2. Remove the broken `timer_protobuf` `file:` dependency from `lambdaDerby`'s `package.json`/`package-lock.json` (Security #2) — confirm CI actually still builds this package.
3. Add a required PR-triggered CI check that runs the existing unit test suite (Code quality) — the tests already exist; they're just not gating merges.
4. Scope the IoT device policies to per-device topic prefixes (Security #3).
5. Bump `axios` off `0.21.4` in `timerIngestion`, and consider `^`-pinning the other `axios` references so patch/security releases land automatically (Dependencies).
6. Delete or finish `TimerPbAlignmentWipTypescriptProbs.svelte`; reconcile the `docs/PermissionAuthorizationPlan.md` link (Code quality — low cost, easy wins).
7. Longer-horizon: split `derbyMain.js` by domain, add ESLint, plan a Svelte 3→5 migration.
