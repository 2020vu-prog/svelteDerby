To run all tests:
```
TEST_USER=userid TEST_PASSWORD=verySecret npm run test
```

For local integration-test credentials, create an ignored `.env.local`:

```
cp .env.local.example .env.local
```

Then edit `.env.local` with the dedicated low-privilege Cognito test user and run:

```
npm run integration
```
