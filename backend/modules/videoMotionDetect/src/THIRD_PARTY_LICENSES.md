# Video motion-detect prototype third-party software

`bin/ffmpeg` and `bin/ffprobe` are built from FFmpeg 7.1.1, downloaded from:

https://ffmpeg.org/releases/ffmpeg-7.1.1.tar.xz

Its SHA-256 is:

```
733984395e0dbbe5c046abda2dc49a5544e7e0e1e2366bba849222ae9e3a03b1
```

`build.sh` (which invokes `buildFfmpeg.sh` inside an `amazonlinux:2023`
container) contains the complete configure command. It explicitly uses
`--disable-gpl` and `--disable-nonfree`; no GPL components such as `libx264`
are enabled. Consequently this FFmpeg build is under LGPL-2.1-or-later, not
GPL. The FFmpeg source and licensing guidance are available at
https://ffmpeg.org/legal.html.

`vendor/` (built by `make vendor`, not committed) contains Pillow, downloaded
as a prebuilt `manylinux2014_x86_64` wheel from PyPI at package-build time.
Pillow is MIT-licensed (HPND-style); see
https://pillow.readthedocs.io/en/stable/about.html#license for the license
text bundled in the wheel's own `dist-info`.

This file and the FFmpeg source URL/checksum must remain with any
distribution of the Lambda artifact. If the build command or FFmpeg version
changes, update this file, `build.sh`, and `bin/ffmpeg`/`bin/ffprobe`
together.
