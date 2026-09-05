#!/usr/bin/env bash

# Build the FFmpeg executable packaged with the direct-transcode pilot.  The
# build deliberately excludes GPL and non-free components; see
# THIRD_PARTY_LICENSES.md for the retained source and build information.
set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "usage: $0 FFMPEG_VERSION SOURCE_URL SOURCE_SHA256" >&2
  exit 2
fi

ffmpeg_version="$1"
source_url="$2"
source_sha256="$3"
source_archive=".build/ffmpeg-${ffmpeg_version}.tar.xz"
source_directory=".build/ffmpeg-${ffmpeg_version}"
output_directory="bin"

mkdir -p .build "${output_directory}"

if [[ ! -f "${source_archive}" ]]; then
  curl --fail --location --silent --show-error "${source_url}" -o "${source_archive}"
fi

printf '%s  %s\n' "${source_sha256}" "${source_archive}" | shasum -a 256 --check --status

if [[ ! -d "${source_directory}" ]]; then
  tar -xJf "${source_archive}" -C .build
fi

export SOURCE_DATE_EPOCH=0

(
  cd "${source_directory}"
  ./configure \
    --prefix=/opt/ffmpeg \
    --disable-gpl \
    --disable-nonfree \
    --disable-autodetect \
    --disable-network \
    --enable-static \
    --disable-shared \
    --extra-ldexeflags=-static \
    --disable-doc \
    --disable-debug \
    --disable-x86asm \
    --disable-ffplay \
    --disable-ffprobe \
    --enable-small
  make -j"$(getconf _NPROCESSORS_ONLN 2>/dev/null || sysctl -n hw.ncpu)" ffmpeg
)

install -m 0755 "${source_directory}/ffmpeg" "${output_directory}/ffmpeg"
strip --strip-all "${output_directory}/ffmpeg" 2>/dev/null || true

license_text="$("${output_directory}/ffmpeg" -L)"
if [[ "${license_text}" != *"GNU Lesser General Public License"* || "${license_text}" == *"GNU General Public License"* ]]; then
  echo "FFmpeg build is not LGPL-only:" >&2
  printf '%s\n' "${license_text}" >&2
  exit 1
fi

"${output_directory}/ffmpeg" -hide_banner -encoders | grep -q ' mpeg4 '
"${output_directory}/ffmpeg" -hide_banner -encoders | grep -q ' aac '
