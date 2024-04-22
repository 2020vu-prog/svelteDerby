SUBDIRS := $(wildcard modules/*/src/.)

all: lambdaPkgs tfplan
auto: lambdaPkgs tfauto

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
