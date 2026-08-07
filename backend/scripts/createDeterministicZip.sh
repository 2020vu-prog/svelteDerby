#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "usage: $0 OUTPUT_ZIP SOURCE_DIRECTORY [SOURCE_FILE ...]" >&2
  exit 2
fi

output_directory="$(cd "$(dirname "$1")" && pwd)"
output_zip="${output_directory}/$(basename "$1")"
source_directory="$(cd "$2" && pwd)"

work_directory="$(mktemp -d)"
trap 'rm -rf "${work_directory}"' EXIT

shift 2
if [[ $# -eq 0 ]]; then
  cp -R "${source_directory}/." "${work_directory}/"
else
  for source_file in "$@"; do
    cp -R "${source_directory}/${source_file}" "${work_directory}/${source_file}"
  done
fi

# ZIP stores timestamps and platform-specific extra fields. Normalize the
# former and omit the latter so identical input bytes produce identical ZIPs.
find "${work_directory}" \( -type d -o -type f \) \
  -exec touch -t 198001010000 {} +
find "${work_directory}" -type l \
  -exec touch -h -t 198001010000 {} +
rm -f "${output_zip}"

(
  cd "${work_directory}"
  find . \( -type f -o -type l \) -print \
    | LC_ALL=C sort \
    | zip -X -q -y "${output_zip}" -@
)
