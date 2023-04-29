#!/bin/bash
pushd s3Utils
	npm i && node  generateChartJson.js
popd
terraform taint null_resource.sync_s3_chart_data
terraform plan -target null_resource.sync_s3_chart_data -out /tmp/chart.out
terraform apply /tmp/chart.out

##### terraform apply -auto-approve

now=$(date '+%s')
sed "s/foo/$now/"<<< '{ "chartKey":"foo" }' > ../frontend/src/config/doNotEditChartKey.json
