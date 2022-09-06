* backend/applyChartJson.sh


## DEPRECATED! use above script instead!
* update ../s3ChartData/**/*.json
* run node generateChartJson.js
* terraform taint null_resource.sync_s3_chart_data
* terraform apply
* update cache force invalidator in ChartAdd.svelte getChartDataFromServer ->params-> chris
