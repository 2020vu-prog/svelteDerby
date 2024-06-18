#!/bin/bash

echo tfde: ${TF_VAR_DeployEnvironment}

source "./generatedTargets-${TF_VAR_DeployEnvironment}.sh"
if [[ -n "$DERBY_CLOUDFRONT" ]]
then
	envsubst < webpack.config.js.template > webpack.config.${TF_VAR_DeployEnvironment}
fi


ln -sf webpack.config.${TF_VAR_DeployEnvironment} webpack.config.js


export now=$(date "+%s")
cat  <<-EOF > src/config/doNotEditChartKey.json
{ "chartKey":"${now}FromDevEnvsh" }
EOF

make env
