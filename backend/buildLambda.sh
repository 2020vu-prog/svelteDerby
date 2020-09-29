function potentialBuild {
	pwd
	ls -l 
	(cd src && 	[[ -s package.json ]] && npm pack)
	([[ -s prepZip.sh ]] && ./prepZip.sh)  ##vod python
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
