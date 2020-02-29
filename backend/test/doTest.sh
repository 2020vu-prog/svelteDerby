set -x
export CF="https://05wv6js1p4.execute-api.us-east-2.amazonaws.com/test"
#export CF="https://d15zun4udup4ky.cloudfront.net/app"
export token=eyJraWQiOiJTK0F5dWQzS3BBSTVUXC9TZzUraTYrV29hcXFKMTZwbEpCUGFWQzNieFBTOD0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJhNDJjMjhmMS1iYTcxLTRlMjItYmZmNi1iN2UwOWNiZDAwYWQiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiYXR0cmlidXRlX2tleTIiOiJhdHRyaWJ1dGVfY2p3MiIsImF0dHJpYnV0ZV9rZXkxIjoiYXR0cmlidXRlX2NqdzEiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0yLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMl9nSFlBb2djcHkiLCJjb2duaXRvOnVzZXJuYW1lIjoiY2xjNCIsImF1ZCI6Ijc1NWhsaHBnaW9tYzM4ajExdW0xM2V1b2FlIiwiZXZlbnRfaWQiOiJmMzkxOWE5Zi04NjhkLTQ2ZjMtYWE0Ny02ZDlkNmFkMmI3MTAiLCJ0b2tlbl91c2UiOiJpZCIsImF1dGhfdGltZSI6MTU4MzAwNTAyNSwiZXhwIjoxNTgzMDA4NjI1LCJpYXQiOjE1ODMwMDUwMjUsImVtYWlsIjoiMjAyMHZ1QGdtYWlsLmNvbSJ9.UYxzi2k-ZTtLmhj57jYKE7FGAyL_wQJtYJIDqDBQ77oSDof_bfvib9tZXc9-APDn8mPPrCLEjJJO9zaBy-ssyRmPKgdY9ofFDgYhYPdXiwrOVI0u0GNw9r1GAqSxXXsQdpKg3aWPqgCrSm2o14pb1Q4LJbFXHR_RVgn850SGMmhLDa7Km6R4UL1Hbff40rfHWn0Hm2f6Ajtr7oIaaMdABnZtI70IAk2Cp1Xh8EEbkQ72cv7diJUG1aXrL9lCPxXU-mta230wuRgvigFSFeYc5lyFpNGuQAwFObQlgY3y-a9ZCXjAmqbvfI81GD5IgRAL_Pof8QyYZ4WbCUHiArsAOw
AUTH="Authorization: $token"

time curl   $VERBOSE $CF/addEventConfig  -XPOST --data @eventConfig.json --header "$AUTH"
time curl   $VERBOSE $CF/addParticipant -XPOST --data @driver.json       --header "$AUTH"
time curl   $VERBOSE $CF/addParticipant -XPOST --data @driver.json       --header "$AUTH"
time curl   $VERBOSE $CF/addPending     -XPOST --data @pending.json       --header "$AUTH"

time curl   $VERBOSE $CF/ddbQuery       -XPOST --data @ddbQuery.json       --header "$AUTH"
time curl  $VERBOSE $CF/addBulk         -XPOST --data @bulk.json        --header "$AUTH"
time curl   $VERBOSE $CF/getRaceConfig  --header "$AUTH"
time curl   $VERBOSE $CF/getRaceHistory?orgId=chi  --header "$AUTH"
