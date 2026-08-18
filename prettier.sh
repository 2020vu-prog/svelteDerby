#!/bin/bash
set -euo pipefail

repo_dir="$(cd "$(dirname "$0")" && pwd)"
prettier_bin="$repo_dir/frontend/node_modules/.bin/prettier"

if [[ ! -x "$prettier_bin" ]]; then
    (
        cd "$repo_dir/frontend"
        npm ci
    )
fi

cd "$repo_dir"

mode="${1:---write}"
if [[ "$mode" != "--write" && "$mode" != "--check" ]]; then
    echo "Usage: $0 [--write|--check]" >&2
    exit 2
fi

js_files=()
while IFS= read -r -d '' file; do
    js_files+=("$file")
done < <(git ls-files -z -- '*.js' '*.mjs')

"$prettier_bin" "$mode" "${js_files[@]}"
