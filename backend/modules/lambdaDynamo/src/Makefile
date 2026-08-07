package.zip: *.js package.json package-lock.json node_modules
	../../../scripts/buildNodeLambdaZip.sh .

node_modules: package.json package-lock.json
	npm ci
