$(warning env: $(TF_VAR_DeployEnvironment))

all: tf

tf: src/sns/sns.sh src/sns/cjwsns src/airhorn/airhorn
	env|grep ^TF_
	terraform plan

src/sns/sns.sh: src/sns/sns.template
	envsubst '$${TF_VAR_DeployEnvironment}' < src/sns/sns.template > src/sns/sns.sh

src/sns/cjwsns: src/sns/main.go
	#cd src/sns && docker run --rm -v "$PWD":/usr/src/myapp -w /usr/src/myapp golang:1.19.4-alpine  go build -v
	cd src/sns && \
		GOOS=linux GOARCH=amd64 go build -v 

src/airhorn/airhorn: src/airhorn/main.go
	cd src/airhorn && \
		GOOS=linux GOARCH=amd64 go build -v 


clean: 
	rm src/sns/sns.sh 2>/dev/null || true
	rm src/sns/cjwsns 2>/dev/null || true
