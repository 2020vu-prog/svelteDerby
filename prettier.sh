#!/bin/bash
export jslist=$(echo  \
    *.js \
    src/*.svelte \
    src/*.js \
    backend/timerIngestion/api/*.js \
    backend/modules/lambda*/src/*.js \
)

prettier --write --plugin-search-dir=. $jslist
