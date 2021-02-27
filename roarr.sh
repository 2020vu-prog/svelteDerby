#find src -name '*.svelte' |xargs perl -i -p -e 's/console.log/log/g' 
#find src -name '*.svelte' |xargs perl -i -p -e 's/console.log/roarrLog/g' 
#find src -name '*.svelte' |xargs perl -i -p -e 's/import log from "roarr"/import { log as roarrLog } from "roarr"/g' 
find src -name '*.svelte' |xargs perl -i -p -e 's/log\(/log.debug\(/g' 
find src -name '*.svelte' |xargs perl -i -p -e 's/import log from "roarr"/import log from "loglevel"/g' 

