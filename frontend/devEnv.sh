#!/bin/bash

echo tfde: ${TF_VAR_DeployEnvironment}

export now=$(date "+%s")
cat  <<-EOF > src/config/doNotEditChartKey.json
{ "chartKey":"${now}FromDevEnvsh" }
EOF

export TF_VAR_AppShortName="${TF_VAR_AppShortName:-Unknown}"
make env
