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

export jslist=$(echo  \
    frontend/*.js \
    frontend/src/*.svelte \
    frontend/src/*.js \
    backend/timerIngestion/api/*.js \
    backend/modules/lambda*/src/*.js \
    backend/modules/lambda*/src/shared/*.js \
    backend/sls/zellopa?/src/*.js \
    backend/scratch509/iotLambda1/src/*.ts \
)

"$prettier_bin" --write --plugin="$prettier_svelte_plugin" $jslist
