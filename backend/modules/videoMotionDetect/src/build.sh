#!/usr/bin/env bash

# Reproducibly (re)builds bin/ffmpeg and bin/ffprobe for the video
# motion-detect Lambda prototype, by running buildFfmpeg.sh inside a
# container matching the Lambda runtime (amazonlinux:2023, x86_64 -- this
# lambda doesn't set `architectures`, so it deploys to AWS's default,
# x86_64). Requires Docker; produces native Linux binaries that cannot be
# built directly on macOS/other host OSes.
#
# This is a deliberately separate, manually-invoked step from `make
# package.zip` -- ffmpeg's C compile takes several minutes, and bin/ffmpeg
# and bin/ffprobe are committed to the repo once built, so ordinary code
# changes to motionDetect.py don't pay that cost on every package build or
# deploy. Only re-run this when bumping FFMPEG_VERSION below.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

FFMPEG_VERSION="7.1.1"
FFMPEG_SOURCE_URL="https://ffmpeg.org/releases/ffmpeg-${FFMPEG_VERSION}.tar.xz"
# Computed locally with `shasum -a 256` against the archive fetched from the
# URL above; pinned so a compromised/altered upstream archive fails closed
# instead of silently building from different source.
FFMPEG_SOURCE_SHA256="733984395e0dbbe5c046abda2dc49a5544e7e0e1e2366bba849222ae9e3a03b1"

docker run --rm -v "$(pwd)":/work -w /work amazonlinux:2023 bash -c "
  set -euo pipefail
  dnf install -y -q gcc glibc-static make tar xz diffutils zlib-devel zlib-static >/dev/null
  ./buildFfmpeg.sh '${FFMPEG_VERSION}' '${FFMPEG_SOURCE_URL}' '${FFMPEG_SOURCE_SHA256}'
"

echo "Built bin/ffmpeg and bin/ffprobe. Commit them along with this script."
