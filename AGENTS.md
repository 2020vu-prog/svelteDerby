# Agent instructions

- Do not be sycophantic.
- Before committing or pushing changes, run Prettier on the JavaScript, MJS, and Svelte files you changed, using the repository configuration and Svelte plugin. Avoid formatting unrelated work.
  - `./prettier.sh` builds its file list from `git ls-files`, so it skips files git does not track yet. `git add` new files before running `--write` or `--check`; otherwise they go unformatted and CI fails on them.
- Before opening or updating a PR, run the checks defined in `.github/workflows/format.yml`. Read the workflow for the current commands and tool versions; do not rely only on targeted tests or `git diff --check`.
  - From the repository root: `./prettier.sh --check`.
  - From `frontend`: `npm test` and `npm run test:components`.
  - From `backend/test`: `npm ci`, then `npm run test:unit` (Node 22 and npm 10; no AWS credentials needed).
  - From the repository root: `terraform fmt -check -recursive .`.
  - From `backend`: `terraform init -backend=false -lockfile=readonly`.
- Install the dependencies required by the workflow when needed, including the backend lambdaDerby dependencies used by frontend route tests.
- Integration-test credentials are already available in `backend/test/.env.local`. Run the integration suite from `backend/test` with `npm run integration`; do not record or expose the credential values. `DERBY_CLOUDFRONT` must target the test environment because the suite writes throwaway `Test.<runId>` data to the deployed stack.
- Fix failures caused by your changes before pushing. If a check is blocked or fails for an unrelated reason, report the exact check and reason; do not claim it passed.
- After pushing, check the PR's CI results and address any failures before reporting that CI passes.
