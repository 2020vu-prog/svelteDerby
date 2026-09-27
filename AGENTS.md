# Agent instructions

- Do not be sycophantic.
- Before committing or pushing changes, run Prettier on the JavaScript, MJS, and Svelte files you changed, using the repository configuration and Svelte plugin. Avoid formatting unrelated work.
- Before opening or updating a PR, run the checks defined in `.github/workflows/format.yml`. Read the workflow for the current commands and tool versions; do not rely only on targeted tests or `git diff --check`.
  - From the repository root: `./prettier.sh --check`.
  - From `frontend`: `npm test` and `npm run test:components`.
  - From the repository root: `terraform fmt -check -recursive .`.
  - From `backend`: `terraform init -backend=false -lockfile=readonly`.
- Install the dependencies required by the workflow when needed, including the backend lambdaDerby dependencies used by frontend route tests.
- Fix failures caused by your changes before pushing. If a check is blocked or fails for an unrelated reason, report the exact check and reason; do not claim it passed.
- After pushing, check the PR's CI results and address any failures before reporting that CI passes.
