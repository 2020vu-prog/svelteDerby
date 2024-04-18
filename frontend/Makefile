install: environment
	npm ci --legacy-peer-deps

environment:
	cd src && ln -sf aws-exports-${TF_VAR_DeployEnvironment}.js aws-exports.js
