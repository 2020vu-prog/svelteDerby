install: environment
	npm ci --legacy-peer-deps

environment:
	cd src && ln -sf aws-exports-${TF_VAR_DeployEnvironment}.js aws-exports.js
	cd public && sed "s/__AppShortName/${TF_VAR_AppShortName}/" < manifest.template > manifest.json
