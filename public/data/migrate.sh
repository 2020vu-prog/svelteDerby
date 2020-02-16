cat << EOF >/dev/null 
{
	"orgId":"chi",
	"carNumber":"778",
	"by":"IT",
	"name":"Elmer"
}
EOF
#cat driver.json|jq . |jq -c '.[]|.["orgId"] = "chi"|.["name"]=.firstName|del (.id,.version,.firstName,.lastUpdateMS)'|jq -s '.'
cat driver.json|jq . |jq -c '.[]|.["orgId"] = "chi"|.["by"]="migrate"|.["name"]=.firstName|del (.id,.version,.firstName,.lastUpdateMS)'| while IFS= read -r line ;
do
	CF="https://d15zun4udup4ky.cloudfront.net/app"
	time curl $VERBOSE  "${CF}/addParticipant" --compress -XPOST --data "$line"
	#time curl $VERBOSE https://05wv6js1p4.execute-api.us-east-2.amazonaws.com/test/addParticipant -XPOST --data
   #printf "%s" "$line" | wc -c
done 
