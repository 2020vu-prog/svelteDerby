FFMPEG_VERSION := 7.1.5
FFMPEG_SOURCE_URL := https://ffmpeg.org/releases/ffmpeg-$(FFMPEG_VERSION).tar.xz
FFMPEG_SOURCE_SHA256 := de668509caf9e35e3cd162473441fdb29538c6d96ed080292b3cf9e6fc5d558f

.PHONY: lambda.zip

lambda.zip: convert.py ffmpeg_convert.py job.json THIRD_PARTY_LICENSES.md buildFfmpeg.sh
	./buildFfmpeg.sh "$(FFMPEG_VERSION)" "$(FFMPEG_SOURCE_URL)" "$(FFMPEG_SOURCE_SHA256)"
	../../../scripts/createDeterministicZip.sh lambda.zip . convert.py ffmpeg_convert.py job.json THIRD_PARTY_LICENSES.md bin
