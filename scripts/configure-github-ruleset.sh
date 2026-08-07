#!/usr/bin/env bash

set -euo pipefail

RULESET_NAME="Protect deployment branches"
REPOSITORY=""
REQUIRED_APPROVALS=1
APPLY=false
API_VERSION="${GITHUB_API_VERSION:-2026-03-10}"

usage() {
  cat <<'EOF'
Usage: scripts/configure-github-ruleset.sh [options]

Create or update the GitHub branch ruleset for the deployment branches.
The default mode is a read-only dry run that prints the proposed JSON.

Options:
  --apply                  Create or update the ruleset.
  --repo OWNER/REPO        Target repository. Defaults to the current gh repo.
  --approvals NUMBER       Required approving reviews. Defaults to 1.
  --name NAME              Ruleset name used for idempotent updates.
  -h, --help               Show this help.

Examples:
  scripts/configure-github-ruleset.sh
  scripts/configure-github-ruleset.sh --repo 2020vu-prog/svelteDerby --apply
  scripts/configure-github-ruleset.sh --approvals 0 --apply

The ruleset protects these branches:
  test.rr1.us
  stage.rr1.us
  go.rr1.us

It requires pull requests, blocks deletion and force pushes, dismisses stale
reviews, and requires review conversations to be resolved. It intentionally
does not require status checks because no pull-request validation workflow has
been established yet.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply)
      APPLY=true
      shift
      ;;
    --repo)
      [[ $# -ge 2 ]] || { echo "--repo requires OWNER/REPO" >&2; exit 2; }
      REPOSITORY="$2"
      shift 2
      ;;
    --approvals)
      [[ $# -ge 2 ]] || { echo "--approvals requires a number" >&2; exit 2; }
      REQUIRED_APPROVALS="$2"
      shift 2
      ;;
    --name)
      [[ $# -ge 2 ]] || { echo "--name requires a value" >&2; exit 2; }
      RULESET_NAME="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

command -v gh >/dev/null || { echo "gh is required" >&2; exit 1; }
command -v jq >/dev/null || { echo "jq is required" >&2; exit 1; }

if ! [[ "$REQUIRED_APPROVALS" =~ ^[0-9]+$ ]] || (( REQUIRED_APPROVALS > 10 )); then
  echo "--approvals must be an integer from 0 through 10" >&2
  exit 2
fi

if [[ -z "$REPOSITORY" ]]; then
  REPOSITORY="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
fi

if ! [[ "$REPOSITORY" =~ ^[^/]+/[^/]+$ ]]; then
  echo "Repository must use OWNER/REPO format: $REPOSITORY" >&2
  exit 2
fi

payload_file="$(mktemp)"
trap 'rm -f "$payload_file"' EXIT

jq -n \
  --arg name "$RULESET_NAME" \
  --argjson approvals "$REQUIRED_APPROVALS" \
  '{
    name: $name,
    target: "branch",
    enforcement: "active",
    bypass_actors: [],
    conditions: {
      ref_name: {
        include: [
          "refs/heads/test.rr1.us",
          "refs/heads/stage.rr1.us",
          "refs/heads/go.rr1.us"
        ],
        exclude: []
      }
    },
    rules: [
      {type: "deletion"},
      {type: "non_fast_forward"},
      {
        type: "pull_request",
        parameters: {
          dismiss_stale_reviews_on_push: true,
          require_code_owner_review: false,
          require_last_push_approval: false,
          required_approving_review_count: $approvals,
          required_review_thread_resolution: true
        }
      }
    ]
  }' > "$payload_file"

echo "Repository: $REPOSITORY"
echo "Ruleset:    $RULESET_NAME"
echo "Approvals:  $REQUIRED_APPROVALS"

if [[ "$APPLY" != true ]]; then
  echo "Mode:       dry run"
  echo
  jq . "$payload_file"
  echo
  echo "No GitHub settings changed. Re-run with --apply after reviewing this configuration."
  exit 0
fi

echo "Mode:       apply"

gh auth status >/dev/null

is_admin="$(gh api \
  -H "X-GitHub-Api-Version: $API_VERSION" \
  "repos/$REPOSITORY" \
  --jq '.permissions.admin')"

if [[ "$is_admin" != "true" ]]; then
  echo "The active gh account does not have repository administration permission." >&2
  echo "Authenticate gh as a repository or organization administrator, then retry." >&2
  exit 1
fi

ruleset_id="$(gh api \
  -H "X-GitHub-Api-Version: $API_VERSION" \
  "repos/$REPOSITORY/rulesets?per_page=100" | \
  jq -r --arg name "$RULESET_NAME" \
    'map(select(.name == $name)) | first | .id // empty')"

if [[ -n "$ruleset_id" ]]; then
  echo "Updating ruleset $ruleset_id..."
  gh api \
    --method PUT \
    -H "X-GitHub-Api-Version: $API_VERSION" \
    "repos/$REPOSITORY/rulesets/$ruleset_id" \
    --input "$payload_file" \
    --jq '{id, name, enforcement, target}'
else
  echo "Creating ruleset..."
  gh api \
    --method POST \
    -H "X-GitHub-Api-Version: $API_VERSION" \
    "repos/$REPOSITORY/rulesets" \
    --input "$payload_file" \
    --jq '{id, name, enforcement, target}'
fi

echo "Ruleset configuration complete."
