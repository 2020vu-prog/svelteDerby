foo=$(date '+%s')
echo $foo
period=30
foo5=$(( (foo/period)* period * 1000 * 1000 ))
echo $foo5

CF="https://d15zun4udup4ky.cloudfront.net/app"
time curl $VERBOSE  "${CF}/getRaceHistory?orgId=chi&hiMicros=$foo5" --compress
