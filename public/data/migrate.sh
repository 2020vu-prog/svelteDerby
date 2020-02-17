#time curl $VERBOSE https://05wv6js1p4.execute-api.us-east-2.amazonaws.com/test/addParticipant -XPOST --data

export CF="https://d15zun4udup4ky.cloudfront.net/app"
cat << EOF >/dev/null 
{
	"orgId":"chi",
	"carNumber":"778",
	"by":"IT",
	"name":"Elmer"
}

  {
    "carNumber1": 101,
    "carNumber2": 113,
    "chartPosition": "14",
    "raceBracketID": 12,
    "phase1DeltaMS": 63,
    "phase2DeltaMS": 40,
    "lastUpdateMS": 1570395962610,
    "id": 117,
    "version": 2
  }
EOF
cat rs.json|jq . |jq -c '
	def phaseWinner(w): if w<0 then [0,w*-1] else [w,0] end ;
	.[]|
	.["orgId"] = "chi"|
	.["PK"] = "\(.orgId):RS"|
	.["rbl"]="\(.raceBracketID):\(.chartPosition)" |
	.["SK"]="\(.rbl).\(.id)"|
	.["by"]="migrate"|
	.["cn"]=[.carNumber1,.carNumber2]|
	.["ph1"]=phaseWinner(.phase1DeltaMS)|
	.["ph2"]=phaseWinner(.phase2DeltaMS)|
	del (.orgId,.rbl,.id,.version,.carNumber1,.carNumber2,.lastUpdateMS,.phase1DeltaMS,.phase2DeltaMS,.raceBracketID,.chartPosition)' > /tmp/xx.json
migratedJson=$(cat /tmp/xx.json|jq -s  .|jq -c .)
	time curl $VERBOSE  "${CF}/addBulk" --compress -XPOST --data "$migratedJson"

exit 99
cat driver.json|jq . |jq -c '.[]|.["orgId"] = "chi"|.["by"]="migrate"|.["name"]=.firstName|del (.id,.version,.firstName,.lastUpdateMS)'| while IFS= read -r line ;
do
	time curl $VERBOSE  "${CF}/addParticipant" --compress -XPOST --data "$line"
   #printf "%s" "$line" | wc -c
done 
