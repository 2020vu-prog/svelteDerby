#!/bin/bash
# Keeps a stable frontend to fall back to: a copy of an earlier entry page named
# index_stable.html, which stays reachable after a newer build replaces index.html.
#
# Deploys use `aws s3 sync` without --delete, so earlier hashed bundles stay in the
# bucket; only the entry page, index.html, is overwritten. A copy of the entry page
# under a fixed name therefore keeps that earlier frontend working at
# /index_stable.html (hash routing means #/route links work, and sign-in and local
# data are shared with the current one).
#
# This script creates the first stable page: the frontend that was live before the
# Svelte 5 frontend replaced it. It copies the live index.html to that fixed name just
# before the replacement, and only when it is safe:
#   - this build is the Svelte 5 frontend (its page carries the frontend-generation
#     marker), so deploying an older build never triggers it;
#   - index_stable.html does not exist yet, so it is written once and never replaced
#     here (moving the stable page forward to a later frontend is a separate,
#     deliberate step);
#   - the live page does not carry the marker, so it really is the earlier frontend
#     and a page from an earlier Svelte 5 deploy is never saved as "stable".
# An unexpected error (permissions, network) stops the deploy rather than skipping,
# because skipping would silently lose the earlier page on the one deploy that matters.
set -euo pipefail

# the attribute may be quoted or not, depending on how the page was minified
marker='name=["'"'"']?frontend-generation'
stable_key="index_stable.html"

if [[ -z "${DERBY_SPA_S3_BUCKET:-}" ]]; then
	source ./loadDeployTargets.sh
fi
bucket="${DERBY_SPA_S3_BUCKET}"

if ! grep -Eq "$marker" public/index.html; then
	echo "stable page: this build is not the new frontend, nothing to keep"
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
	echo "stable page: unexpected error checking $1: $out" >&2
	exit 1
}

if object_exists "$stable_key"; then
	echo "stable page: $stable_key already exists, leaving it as it is"
	exit 0
fi

if ! object_exists "index.html"; then
	echo "stable page: no live index.html yet (first deploy), nothing to keep"
	exit 0
fi

live=$(aws s3 cp "s3://${bucket}/index.html" -)
if grep -Eq "$marker" <<<"$live"; then
	echo "stable page: the live page is already the new frontend, so there is no earlier frontend to keep"
	exit 0
fi

aws s3 cp "s3://${bucket}/index.html" "s3://${bucket}/${stable_key}" --metadata-directive COPY
echo "stable page: kept the live index.html as $stable_key"
