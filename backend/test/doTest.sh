export CF="https://05wv6js1p4.execute-api.us-east-2.amazonaws.com/test"
#export CF="https://d15zun4udup4ky.cloudfront.net/app"
export token=eyJraWQiOiJTK0F5dWQzS3BBSTVUXC9TZzUraTYrV29hcXFKMTZwbEpCUGFWQzNieFBTOD0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJhNDJjMjhmMS1iYTcxLTRlMjItYmZmNi1iN2UwOWNiZDAwYWQiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiYXR0cmlidXRlX2tleTIiOiJhdHRyaWJ1dGVfY2p3MiIsImF0dHJpYnV0ZV9rZXkxIjoiYXR0cmlidXRlX2NqdzEiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0yLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMl9nSFlBb2djcHkiLCJjb2duaXRvOnVzZXJuYW1lIjoiY2xjNCIsImF1ZCI6Ijc1NWhsaHBnaW9tYzM4ajExdW0xM2V1b2FlIiwiZXZlbnRfaWQiOiJiZGFhMDU5Zi05MTJkLTQwYTAtOWNmYy00ODc5MTlhNzc4NzIiLCJ0b2tlbl91c2UiOiJpZCIsImF1dGhfdGltZSI6MTU4Mjc3MzE1NCwiZXhwIjoxNTgyNzc2NzU0LCJpYXQiOjE1ODI3NzMxNTQsImVtYWlsIjoiMjAyMHZ1QGdtYWlsLmNvbSJ9.PwrD--m1HOH7CM2jD1E64vW0c6FJC_J0zUUi4GB5_JaFv9APpa4kxtPw_ibw3osP12YxfVOn8UPcOqbXu4c-rEgxPWa87BwRs5MXqvK2AkQfAMSQy_t20a3Xj44fwWz0fMK2IGNJSBKj9u9j_xfarJMwoCJOBZdO_kp6ysU5CTGlDMvgL-A4yXWcmUt47VbBe0QqVecCwiDl1LXQqEogMZTVmWSCZu6lv3JdBirdz6rU8To3IO9aBqZdLTxTQLoX-usBoGYa6wK3zgHaOyM5Bqfy2zwUX40tAYJt-KoAXolV1l3B2AIPB3WD4aU8o-L_TF6JhefBaM2QOhjYTk6QNA
AUTH="Authorization: $token"

#time curl  $VERBOSE $CF/addBulk         -XPOST --data @bulk.json        --header "$AUTH"
time curl   $VERBOSE $CF/addEventConfig  -XPOST --data @eventConfig.json --header "$AUTH"
time curl   $VERBOSE $CF/addParticipant -XPOST --data @driver.json       --header "$AUTH"
time curl   $VERBOSE $CF/addParticipant -XPOST --data @driver.json       --header "$AUTH"
time curl   $VERBOSE $CF/addPending     -XPOST --data @pending.json       --header "$AUTH"

time curl   $VERBOSE $CF/ddbQuery       -XPOST --data @ddbQuery.json       --header "$AUTH"
time curl   $VERBOSE $CF/getRaceConfig  --header "$AUTH"
