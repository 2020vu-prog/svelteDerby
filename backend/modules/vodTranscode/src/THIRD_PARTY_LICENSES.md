# Direct-transcode pilot third-party software

`bin/ffmpeg` is built from FFmpeg 7.1.5, downloaded from:

https://ffmpeg.org/releases/ffmpeg-7.1.5.tar.xz

Its SHA-256 is:

```
de668509caf9e35e3cd162473441fdb29538c6d96ed080292b3cf9e6fc5d558f
```

`buildFfmpeg.sh` contains the complete configure command. It explicitly uses
`--disable-gpl` and `--disable-nonfree`; no GPL components such as `libx264`
are enabled. Consequently this FFmpeg build is under LGPL-2.1-or-later, not
GPL. The FFmpeg source and licensing guidance are available at
https://ffmpeg.org/legal.html.

This file and the source URL must remain with any distribution of the Lambda
artifact. If the build command or FFmpeg version changes, update this file and
the checksum together.
