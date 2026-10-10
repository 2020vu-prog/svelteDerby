# Direct-transcode pilot third-party software

`bin/ffmpeg` is not built independently by this module. It's a copy of the
FFmpeg binary already built and committed by
[`videoMotionDetect`](../../videoMotionDetect/src/THIRD_PARTY_LICENSES.md),
which cross-compiles it inside an `amazonlinux:2023` container (see that
module's `build.sh`) to guarantee Lambda-runtime compatibility -- something
this module's own prior build script, which compiled on whatever host ran
`make`, did not guarantee. See that file for the pinned FFmpeg version,
source URL, checksum, and the full configure command
(`--disable-gpl --disable-nonfree`, LGPL-2.1-or-later; no GPL components
such as `libx264` are enabled). The `mpeg4` and `aac` encoders this module
needs are part of that build's default LGPL encoder set; neither module
disables them.

This file must remain with any distribution of this Lambda artifact,
alongside `videoMotionDetect`'s `THIRD_PARTY_LICENSES.md`. If this module's
FFmpeg needs ever diverge from `videoMotionDetect`'s (an encoder one needs
that the other explicitly disables, or a version bump one module can't take
yet), stop sharing the binary and give this module its own pinned build
again rather than patching the shared one to satisfy both.
