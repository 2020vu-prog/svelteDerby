#!/bin/bash

source "./generatedTargets-${TF_VAR_DeployEnvironment}.sh"
envsubst < webpack.config.js.template > webpack.config.${TF_VAR_DeployEnvironment}
 ln -sf webpack.config.${TF_VAR_DeployEnvironment} webpack.config.js


export now=$(date "+%s")
cat  <<-EOF > src/config/doNotEditChartKey.json
{ "chartKey":"${now}FromDevEnvsh" }
EOF

make env
