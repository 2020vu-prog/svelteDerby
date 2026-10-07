#!/bin/bash
# Keeps the previous (pre-Svelte-5) entry page as index_legacy.html, so the old
# frontend can still be opened after the new one replaces index.html.
#
# Deploys use `aws s3 sync` without --delete, so the old hashed bundles stay in the
# bucket; only the entry page, index.html, is overwritten. This copies the live
# index.html to a fixed name just before that happens, and only when it is safe:
#   - this build is the new frontend (its page carries the frontend-generation
#     marker), so an old build never triggers it;
#   - index_legacy.html does not exist yet, so it is written once and never replaced;
#   - the live page does not carry the marker, so it really is the old frontend and
#     a page from an earlier new-frontend deploy is never saved as "legacy".
# An unexpected error (permissions, network) stops the deploy rather than skipping,
# because skipping would silently lose the old page on the one deploy that matters.
set -euo pipefail

# the attribute may be quoted or not, depending on how the page was minified
marker='name=["'"'"']?frontend-generation'
legacy_key="index_legacy.html"

if [[ -z "${DERBY_SPA_S3_BUCKET:-}" ]]; then
	source ./loadDeployTargets.sh
fi
bucket="${DERBY_SPA_S3_BUCKET}"

if ! grep -Eq "$marker" public/index.html; then
	echo "legacy page: this build is not the new frontend, nothing to keep"
	exit 0
fi

# 0 if the object exists, 1 if it is definitely missing; anything else stops the run
object_exists() {
	local out
	if out=$(aws s3api head-object --bucket "$bucket" --key "$1" 2>&1); then
		return 0
	fi
	if grep -qE "Not Found|NoSuchKey|\(404\)" <<<"$out"; then
		return 1
	fi
	echo "legacy page: unexpected error checking $1: $out" >&2
	exit 1
}

if object_exists "$legacy_key"; then
	echo "legacy page: $legacy_key already exists, leaving it as it is"
	exit 0
fi

if ! object_exists "index.html"; then
	echo "legacy page: no live index.html yet (first deploy), nothing to keep"
	exit 0
fi

live=$(aws s3 cp "s3://${bucket}/index.html" -)
if grep -Eq "$marker" <<<"$live"; then
	echo "legacy page: the live page is already the new frontend, so there is no earlier frontend to keep"
	exit 0
fi

aws s3 cp "s3://${bucket}/index.html" "s3://${bucket}/${legacy_key}" --metadata-directive COPY
echo "legacy page: kept the live index.html as $legacy_key"
