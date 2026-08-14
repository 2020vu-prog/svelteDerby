SUBDIRS := $(wildcard modules/*/src/.)
NODE22_LAMBDA_DIRS := modules/lambdaDerby/src/. modules/lambdaDynamo/src/. modules/lambdaSqs/src/.
LEGACY_LAMBDA_DIRS := $(filter-out $(NODE22_LAMBDA_DIRS),$(SUBDIRS))

all: lambdaPkgs tfplan
auto: lambdaPkgs tfauto

lambdaPkgs: $(SUBDIRS) 
lambdaPkgsLegacy: $(LEGACY_LAMBDA_DIRS)

$(SUBDIRS):
	$(MAKE) -C $@
	echo $@

.PHONY: all $(SUBDIRS) tfplan lambdaPkgs lambdaPkgsLegacy auto tfauto

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
