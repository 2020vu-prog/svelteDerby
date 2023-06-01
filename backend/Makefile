SUBDIRS := $(wildcard modules/*/src/.)

all: lambdaPkgs tfplan
auto: lambdaPkgs tfauto

lambdaPkgs: $(SUBDIRS) 

$(SUBDIRS):
	$(MAKE) -C $@
	echo $@

.PHONY: all $(SUBDIRS) tfplan lambdaPkgs auto tfauto

tfplan: $(SUBDIRS)
	terraform apply
tfauto: $(SUBDIRS)
	terraform apply -auto-approve
valid:
	terraform validate -json
