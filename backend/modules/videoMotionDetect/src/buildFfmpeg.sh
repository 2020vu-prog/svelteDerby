#!/usr/bin/env bash

# Build the FFmpeg executable packaged with the video motion-detect Lambda
# prototype. The build deliberately excludes GPL and non-free components
# (LGPL-only, matching the license posture of the vodTranscode module's
# equivalent script). Must run on Linux (invoked from a matching Docker
# container by build.sh) since it produces a native binary for the Lambda
# runtime, not whatever OS is doing the invoking.
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

printf '%s  %s\n' "${source_sha256}" "${source_archive}" | sha256sum --check --status

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
    --enable-zlib \
    --enable-static \
    --disable-shared \
    --extra-ldexeflags=-static \
    --disable-doc \
    --disable-debug \
    --disable-x86asm \
    --disable-ffplay \
    --enable-small
  make -j"$(nproc)" ffmpeg ffprobe
)

install -m 0755 "${source_directory}/ffmpeg" "${output_directory}/ffmpeg"
install -m 0755 "${source_directory}/ffprobe" "${output_directory}/ffprobe"
strip --strip-all "${output_directory}/ffmpeg" "${output_directory}/ffprobe" 2>/dev/null || true

for bin in ffmpeg ffprobe; do
  license_text="$("${output_directory}/${bin}" -L)"
  # ffmpeg hard-wraps this banner at a fixed column, so an exact phrase can
  # straddle a newline (e.g. "...General Public\nLicense..."); normalize
  # whitespace before matching so line-wrapping doesn't break the check.
  normalized_license_text="$(printf '%s' "${license_text}" | tr '\n' ' ' | tr -s ' ')"
  if [[ "${normalized_license_text}" != *"GNU Lesser General Public License"* || "${normalized_license_text}" == *" GNU General Public License"* ]]; then
    echo "${bin} build is not LGPL-only:" >&2
    printf '%s\n' "${license_text}" >&2
    exit 1
  fi
done

# `-encoders` only proves an encoder is *registered*, not that it actually
# works -- e.g. PNG's encoder registers even when built without zlib, and
# only fails at encode time ("Automatic encoder selection failed... probably
# disabled"). Actually encode a frame so a missing runtime dependency for an
# encoder this Lambda needs fails the build, not a live request.
"${output_directory}/ffmpeg" -y -hide_banner -loglevel error \
  -f lavfi -i "color=c=black:s=16x16:d=1" -frames:v 1 \
  "${output_directory}/.pngcheck.png"
[[ -s "${output_directory}/.pngcheck.png" ]]
rm -f "${output_directory}/.pngcheck.png"

"${output_directory}/ffprobe" -hide_banner -version | grep -q 'ffprobe version'
