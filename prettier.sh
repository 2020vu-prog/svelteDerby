#!/bin/bash
export jslist=$(echo  \
    frontend/*.js \
    frontend/src/*.svelte \
    frontend/src/*.js \
    backend/timerIngestion/api/*.js \
    backend/modules/lambda*/src/*.js \
    backend/modules/lambda*/src/shared/*.js \
    backend/sls/zellopa?/src/*.js \
    backend/scratch509/iotLambda1/src/*.ts \
)

prettier --write --plugin-search-dir=./frontend --svelte-bracket-new-line=false $jslist
