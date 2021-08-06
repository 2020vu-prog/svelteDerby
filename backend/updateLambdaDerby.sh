##
## workaround for broken npm pack when the parent directory had a package.json
## s/b deprecated 2021-07-10

rm    modules/lambdaDerby/src/package.zip ||true
rm    modules/lambdaDerby/src/src-1.0.0.tgz ||true
touch modules/lambdaDerby/src/src-1.0.0.tgz  ## TODO: delete! pack fails w/o this!?
#(cd modules/lambdaDerby/src/ && npm pack) && terraform apply -auto-approve
(cd modules/lambdaDerby/src/ && npm pack) 
pushd modules/lambdaDerby/src
pwd
tarball=$(npm list --depth 0 | sed 's/@/-/g; s/ .*/.tgz/g; 1q;'); tar -tf $tarball |                       sed 's|^package/||' | zip -@r package; echo tarball: $tarball;ls -l $tarball;

##TODO: npm pack is building huge file with parent dir (svelte)
## troubleshoot issue pending (npm version changed?)
##  interim step requires separate terraform apply...
