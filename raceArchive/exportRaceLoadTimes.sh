 #gzip -d < Ndr2020NationalsQualifier.json.gz |jq -c '.[] | select( .PK ==  "NDR.1f1a4:RP" and  has("phr")== false) '
# gzip -d < Ndr2020NationalsQualifier.json.gz |jq -c -r  '.[] | select( .PK ==  "NDR.1f1a4:RP" and  has("phr")== false) |[.at, .by, .SK, .PK, .cn[0],.cn[1], .pl]|@csv'
#gzip -d < Ndr2020NationalsQualifier.json.gz |jq -c -r  '.[] | select( .PK ==  "NDR.1f1a4:RP" and  has("phr")== false) |[.at, .by, .cn[0],.cn[1], .pl]|@csv'
#gzip -d < Ndr2020NationalsQualifier.json.gz |jq -c -r  '.[] | select(select( .PK |  test(":RP" )) and  has("phr")== false) |[.at, .by, .cn[0],.cn[1], .pl]|@csv'

#export TZ='Asia/Kolkata'
export TZ='America/Indiana/Indianapolis'
if ! [[ -f $1 ]]
then
	echo missing or unknown file [$1]  
	exit 99
fi  
echo 'At,By, Lane1, Lane2, Phase'
gzip -d < "$1" | 
      	jq -c -r  '.[] | select(select( .PK |  test(":RP" )) and  has("phr")== false) ' |
        jq '.at |= ( . / 1000|strflocaltime("%Y-%m-%d %H:%M:%S")) ' |
        jq -r '.  |[.at, .by, .cn[0],.cn[1], .pl]|@csv'  |
	sort
