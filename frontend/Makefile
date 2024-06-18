TF_VAR_AppShortName?=Test.RR1
TF_VAR_DeployEnvironment?=derbyTest
.PHONY: install env environment shared

install: environment shared
	npm ci --legacy-peer-deps

env: environment
environment:
	[[ -n "${TF_VAR_AppShortName}" ]] || (echo missing env for TF_VAR_AppShortName && exit 9)
	cd src && ln -sf aws-exports-${TF_VAR_DeployEnvironment}.js aws-exports.js
	cd public && sed "s/__AppShortName/${TF_VAR_AppShortName}/" < manifest.template > manifest.json

shared:
	cd ../backend/modules/lambdaDerby/src && npm i

local: install
	TF_VAR_DeployEnvironment=$(TF_VAR_DeployEnvironment) npm run dev
