# bin/ffmpeg and bin/ffprobe are committed to the repo, not rebuilt here --
# see build.sh. Only re-run that manually when bumping the pinned ffmpeg
# version; it needs Docker and takes several minutes.

PILLOW_VERSION := 12.2.0

.PHONY: clean

package.zip: motionDetect.py bin/ffmpeg bin/ffprobe vendor
	rm -f package.zip
	rm -rf .package
	mkdir -p .package
	cp motionDetect.py .package/
	cp -r bin .package/bin
	cp -r vendor/. .package/
	cd .package && zip -X -r ../package.zip . -x '*/__pycache__/*' -x '*/*.dist-info/*'
	rm -rf .package

vendor:
	rm -rf vendor
	python3 -m pip install \
		--platform manylinux2014_x86_64 \
		--implementation cp \
		--python-version 3.13 \
		--only-binary=:all: \
		--target vendor \
		--no-deps \
		Pillow==$(PILLOW_VERSION)

clean:
	rm -rf vendor .package package.zip
