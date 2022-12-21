#!/bin/bash
export AWS_PROFILE=svelteDerby
ssh-agent ./.discoverAndAuth.sh  "$@" --jumpOnly
