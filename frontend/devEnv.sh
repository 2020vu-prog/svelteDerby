#!/bin/bash
export now=$(date "+%s")
cat  <<-EOF > src/config/doNotEditChartKey.json
{ "chartKey":"${now}FromDevEnvsh" }
EOF
