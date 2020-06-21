#!/bin/bash
export jslist=$(echo  \
    *.js \
    src/*.svelte \
    src/*.js \
    backend/timerIngestion/api/*.js \
)

prettier --write --plugin-search-dir=. $jslist
