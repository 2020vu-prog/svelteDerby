#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

if [[ -f .env.local ]]; then
    set -a
    source .env.local
    set +a
fi

if [[ -z "${TEST_USER:-}" || -z "${TEST_PASSWORD:-}" ]]; then
    echo "Missing TEST_USER or TEST_PASSWORD."
    echo "Create backend/test/.env.local from .env.local.example, or export them before running."
    exit 1
fi

export NODE_PATH="${PWD}/node_modules${NODE_PATH:+:${NODE_PATH}}"

npm run test:integration
