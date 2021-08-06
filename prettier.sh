#!/bin/bash
export jslist=$(echo  \
    frontend/*.js \
    frontend/src/*.svelte \
    frontend/src/*.js \
    backend/timerIngestion/api/*.js \
    backend/modules/lambda*/src/*.js \
    backend/modules/lambda*/src/shared/*.js \
    backend/sls/zellopa?/src/*.js \
)

prettier --write --plugin-search-dir=./frontend $jslist
