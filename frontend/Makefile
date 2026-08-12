SHELL := /bin/bash

TF_VAR_AppShortName?=Test.RR1
.PHONY: install env environment shared

install: environment shared
	npm ci --legacy-peer-deps

env: environment
environment:
	[[ -n "${TF_VAR_AppShortName}" ]] || (echo missing env for TF_VAR_AppShortName && exit 9)
	cd public && sed "s/__AppShortName/${TF_VAR_AppShortName}/" < manifest.template > manifest.json

shared:
	cd ../backend/modules/lambdaDerby/src && npm i

local: install
	TF_VAR_DeployEnvironment=$(TF_VAR_DeployEnvironment) npm run dev
