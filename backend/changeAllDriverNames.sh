#!/bin/bash

## script used to generate data to test CCA
jq -c '.[]|.name="cjw"'  ~/Downloads/drivers-March\ WIN-ter\ Series\ 2024 .json|jq --slurp > ~/driversCJW.json
