SUBDIRS := $(wildcard modules/*/src/.)

all: lambdaPkgs tfplan

lambdaPkgs: $(SUBDIRS) 

$(SUBDIRS):
	$(MAKE) -C $@
	echo $@

.PHONY: all $(SUBDIRS) tfplan lambdaPkgs

tfplan: $(SUBDIRS)
	terraform plan
valid:
	terraform validate -json
