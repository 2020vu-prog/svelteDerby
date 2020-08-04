node  s3Utils/generateChartJson.js
terraform taint null_resource.sync_s3_chart_data
terraform apply -auto-approve
now=$(date '+%s')
sed "s/foo/$now/"<<< '{ "chartKey":"foo" }' > ../src/config/doNotEditChartKey.json
