#!/bin/bash
echo env: $TF_VAR_DeployEnvironment
    echo ver $npm_package_version
cp public/index.html public/index_${TF_VAR_DeployEnvironment}_${npm_package_version}.html

