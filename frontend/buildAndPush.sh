#!/bin/bash
set -e

./s3Push.sh --check-config
export NODE_OPTIONS=--openssl-legacy-provider
make install &&  npm run build && ./s3Push.sh
