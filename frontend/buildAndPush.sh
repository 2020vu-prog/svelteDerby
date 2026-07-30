#!/bin/bash
export NODE_OPTIONS=--openssl-legacy-provider
make install &&  npm run build && ./s3Push.sh
