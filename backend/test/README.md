# Backend tests

This directory contains unit tests and deployed integration tests for the
Derby backend.

## Setup

Use Node 18 and npm 8, then install the test dependencies:

```bash
cd backend/test
npm install
cp .env.local.example .env.local
```

Set these values in the ignored `.env.local` file:

```bash
TEST_USER=integration-test@example.com
TEST_PASSWORD=replace-me
DERBY_CLOUDFRONT=https://test.rr1.us
```

Use a dedicated Cognito test user with the permissions exercised by the
integration suite. Do not commit `.env.local`, `token.txt`, or credentials.

## Commands

Run unit tests only:

```bash
npm run test:unit
```

Run the deployed integration suite:

```bash
npm run integration
```

Run both:

```bash
npm test
```

`runIntegration.sh` loads `.env.local`, obtains a Cognito token, and runs the
integration files serially. Runtime configuration requests use an
unconditional cache buster so the tests do not reuse an old deployment
configuration response.

## Integration event

Each integration invocation generates one shared event under the `Test`
organization. All integration test files receive the same generated `orgId`
and timestamp. The event remains in the deployed test environment for UI and
database diagnostics and expires according to the backend event TTL.

## MQTT verification

The integration runner starts one anonymous MQTT collector before Jest and
keeps it connected until all integration files finish. It verifies:

- all messages use the shared event topic and `orgId`;
- payloads are valid JSON;
- participant 333 is published;
- chart heat 1 completes both phases;
- winner 100 advances to heat 3;
- loser 109 advances to heat 7;
- the final event configuration update is observed.

Every received record is written in arrival order as JSON Lines:

```text
/tmp/svelte-derby-mqtt-<timestamp>.jsonl
```

The runner prints this path. Missing required messages fail the run. A total
different from the current 57-message baseline emits a warning and points to
the JSONL log, but does not fail otherwise-correct behavior.

A complete successful-run example is checked in at
[`fixtures/mqtt-messages.example.jsonl`](fixtures/mqtt-messages.example.jsonl).

## Test behavior

The suite mutates the deployed test environment. It creates participants,
races, phases, and bracket positions. Run it only against an environment
intended for integration testing, not production.
