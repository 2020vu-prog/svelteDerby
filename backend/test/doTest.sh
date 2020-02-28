#export CF="https://05wv6js1p4.execute-api.us-east-2.amazonaws.com/test"
export CF="https://d15zun4udup4ky.cloudfront.net/app"
export token=eyJraWQiOiJTK0F5dWQzS3BBSTVUXC9TZzUraTYrV29hcXFKMTZwbEpCUGFWQzNieFBTOD0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJhNDJjMjhmMS1iYTcxLTRlMjItYmZmNi1iN2UwOWNiZDAwYWQiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiYXR0cmlidXRlX2tleTIiOiJhdHRyaWJ1dGVfY2p3MiIsImF0dHJpYnV0ZV9rZXkxIjoiYXR0cmlidXRlX2NqdzEiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0yLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMl9nSFlBb2djcHkiLCJjb2duaXRvOnVzZXJuYW1lIjoiY2xjNCIsImF1ZCI6Ijc1NWhsaHBnaW9tYzM4ajExdW0xM2V1b2FlIiwiZXZlbnRfaWQiOiI4NTI3N2ZiZC05MTk5LTQxMjUtOGFhZC0xZDM1ZDU4YWE2ODgiLCJ0b2tlbl91c2UiOiJpZCIsImF1dGhfdGltZSI6MTU4Mjg1ODM2NSwiZXhwIjoxNTgyODYxOTY2LCJpYXQiOjE1ODI4NTgzNjYsImVtYWlsIjoiMjAyMHZ1QGdtYWlsLmNvbSJ9.XDPfmpk-gOd_RE-XtktCEah4NzpTvnU2rLEFC3TJV5p8w_3Ra4W9XkV_TvOCzm5QGkzszyRBckmA0NHiJbSZaJov3TFeQasjz5mV3RGO5D_sNQ5z4xMh1jIcvBQplew70YpiomINe6HUN2Bjd7_c4HE_1vq0zyg9phxUaA2ZjUlieKu0pLcwByNEGwS99ZUu1SriTC_ew2GnmOdaR8oz-cV4_Wh4hAF4y8_kVIWWud98R3SkI6l7VXjeMs3VGGnXqGoQqgMMFVbpKnV7brcA1dNTyIVRwcBPoVFhc0K-lc_buafmqOI2TIXNtWgC3XbizPzGavd1yOKnbo8GB-FlsQ
AUTH="Authorization: $token"

#time curl  $VERBOSE $CF/addBulk         -XPOST --data @bulk.json        --header "$AUTH"
time curl   $VERBOSE $CF/addEventConfig  -XPOST --data @eventConfig.json --header "$AUTH"
time curl   $VERBOSE $CF/addParticipant -XPOST --data @driver.json       --header "$AUTH"
time curl   $VERBOSE $CF/addParticipant -XPOST --data @driver.json       --header "$AUTH"
time curl   $VERBOSE $CF/addPending     -XPOST --data @pending.json       --header "$AUTH"

time curl   $VERBOSE $CF/ddbQuery       -XPOST --data @ddbQuery.json       --header "$AUTH"
time curl   $VERBOSE $CF/getRaceConfig  --header "$AUTH"
