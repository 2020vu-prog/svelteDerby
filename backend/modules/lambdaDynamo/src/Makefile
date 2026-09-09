package.zip: *.js package.json package-lock.json node_modules test
	../../../scripts/buildNodeLambdaZip.sh .

test: node_modules
	npm test

node_modules: package.json package-lock.json
	npm ci

.PHONY: test
