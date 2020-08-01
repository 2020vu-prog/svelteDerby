function potentialBuild {
	pwd
	ls -l 
	(cd src && 	npm pack)
}
function main {
	for dir in modules/*/src
	do
		moduleName=$(dirname $dir)
		echo $moduleName
		pushd $moduleName
			potentialBuild
		popd
	done
}
main
