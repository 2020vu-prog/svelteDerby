# bin/ffmpeg is not built here -- it's a copy of the binary already built
# and committed by ../../videoMotionDetect/src/bin/ffmpeg (cross-compiled
# for the Lambda runtime via that module's build.sh/Docker step). See
# THIRD_PARTY_LICENSES.md.
MOTION_DETECT_FFMPEG := ../../videoMotionDetect/src/bin/ffmpeg

lambda.zip: convert.py ffmpeg_convert.py job.json THIRD_PARTY_LICENSES.md $(MOTION_DETECT_FFMPEG)
	mkdir -p bin
	cp $(MOTION_DETECT_FFMPEG) bin/ffmpeg
	chmod 0755 bin/ffmpeg
	../../../scripts/createDeterministicZip.sh lambda.zip . convert.py ffmpeg_convert.py job.json THIRD_PARTY_LICENSES.md bin
