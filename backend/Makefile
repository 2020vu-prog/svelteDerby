SUBDIRS := $(wildcard modules/*/src/.)

all: $(SUBDIRS)
$(SUBDIRS):
	$(MAKE) -C $@
	echo $@

.PHONY: all $(SUBDIRS)
