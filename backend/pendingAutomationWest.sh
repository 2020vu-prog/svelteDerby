function dodo {
aws iot --region=us-west-2 attach-principal-policy --policy-name cognitoDerbyPolicy  --principal $1
#aws iot --region=us-west-2 attach-policy --policy-name cognitoDerbyPolicy  --target $1
}

dodo us-west-2:0e0c39d7-3bd5-4dc4-8d5c-0ae5575a315f
dodo us-west-2:98b4466f-2eff-4c32-9781-9635a4006b33
dodo us-west-2:db93a9e0-9060-4ae8-ae10-3dbd41b0492c
dodo us-west-2:fca0ab90-cebe-4fa5-b747-af98774fe594
dodo us-west-2:a46e8dd9-7995-4ee4-ac56-f1754b55bba6
