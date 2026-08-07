#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: $0 LAMBDA_SOURCE_DIRECTORY" >&2
  exit 2
fi

source_directory="$(cd "$1" && pwd)"
scripts_directory="$(cd "$(dirname "$0")" && pwd)"
work_directory="$(mktemp -d)"
trap 'rm -rf "${work_directory}"' EXIT

# Ignore the legacy package lifecycle scripts: their ZIP command preserves
# working-tree timestamps. npm still selects and bundles the package contents.
rm -f "${source_directory}/package.zip"
(
  cd "${source_directory}"
  npm pack \
    --ignore-scripts \
    --loglevel error \
    --cache "${work_directory}/npm-cache" \
    --pack-destination "${work_directory}" \
    >/dev/null
)

tarball=("${work_directory}"/*.tgz)
if [[ ${#tarball[@]} -ne 1 || ! -f "${tarball[0]}" ]]; then
  echo "expected npm pack to create exactly one tarball" >&2
  exit 1
fi

tar -xzf "${tarball[0]}" -C "${work_directory}"
"${scripts_directory}/createDeterministicZip.sh" \
  "${source_directory}/package.zip" \
  "${work_directory}/package"
