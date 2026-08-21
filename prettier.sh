#!/bin/bash
set -euo pipefail

repo_dir="$(cd "$(dirname "$0")" && pwd)"
prettier_bin="$repo_dir/frontend/node_modules/.bin/prettier"
prettier_svelte_plugin="$repo_dir/frontend/node_modules/prettier-plugin-svelte/plugin.js"

if [[ ! -x "$prettier_bin" || ! -f "$prettier_svelte_plugin" ]]; then
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

source_files=()
while IFS= read -r -d '' file; do
    source_files+=("$file")
done < <(git ls-files -z -- '*.js' '*.mjs' '*.svelte')

"$prettier_bin" "$mode" --plugin="$prettier_svelte_plugin" "${source_files[@]}"
