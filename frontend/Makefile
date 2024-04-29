install: environment
	npm ci --legacy-peer-deps

env: environment
environment:
	[[ -n "${TF_VAR_AppShortName}" ]] || (echo missing env for TF_VAR_AppShortName && exit 9)
	cd src && ln -sf aws-exports-${TF_VAR_DeployEnvironment}.js aws-exports.js
	cd public && sed "s/__AppShortName/${TF_VAR_AppShortName}/" < manifest.template > manifest.json
