SUBDIRS := $(wildcard modules/*/src/.)

all: lambdaPkgs tfplan
auto: lambdaPkgs tfauto

# Each module dir's default target (package.zip, or lambda.zip for
# vodTranscode) is independent of the others -- own directory, own
# dependency install, own work directory in the zip-building scripts --
# so `make -jN lambdaPkgs` builds them concurrently instead of one at a
# time. See .github/workflows/deploy.yml for the CI invocation.
lambdaPkgs: $(SUBDIRS)

$(SUBDIRS):
	$(MAKE) -C $@
	echo $@

.PHONY: all $(SUBDIRS) tfplan lambdaPkgs auto tfauto

tfplan: $(SUBDIRS) terraEnv
	terraform apply
tfauto: $(SUBDIRS) terraEnv
	terraform apply -auto-approve
valid:
	terraform validate -json

terraEnv:
	grep -c "${TF_VAR_BackendBucket}" .terraform/terraform.tfstate  || terraform init -reconfigure  -backend-config=${TF_BACKEND_CONFIG}

vod: terraEnv
	terraform taint module.vodTranscode.aws_cloudformation_stack.vodTranscodeStack

frontend:
	(cd ../frontend/ && ./buildAndPush.sh)
