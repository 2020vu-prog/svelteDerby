#!/bin/bash
set -e

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"

branch=$(git -C "$repo_root" branch --show-current)
hash=$(git -C "$repo_root" rev-parse --short HEAD)
buildTime="$(date +%s)000"
dirty="clean"
if [[ -n "$(git -C "$repo_root" status --porcelain --untracked-files=no)" ]]; then
    dirty="dirty"
fi

printf '{"branch":"%s","hash":"%s","buildTime":"%s","dirty":"%s"}\n' \
    "$branch" "$hash" "$buildTime" "$dirty"
