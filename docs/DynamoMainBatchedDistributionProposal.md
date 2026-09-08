# Proposal: batched `dynamoMain` distribution with contiguous sequences

Date: 2026-09-08

## Objective

Replace the current one-source-record/one-`DerbyDist`-item/one-MQTT-message flow with one ordered envelope per organization for each Lambda stream batch. Persist and publish the same envelope, and give new envelopes contiguous per-organization sequence numbers.

“Contiguous” means that committed v2 envelopes for one organization are numbered `1, 2, 3, ...` without gaps. It does not imply ordering between organizations, and it cannot be applied retroactively to the existing epoch-microsecond `DS` records.

## Current behavior

The DynamoDB event-source mapping collects up to 10 `DerbyMain` stream records, with a maximum batching window of two seconds. `dynamoMain.handler` still processes those records individually. For every valid record it:

1. Creates a distribution record with `DP = orgId` and an epoch-microsecond `DS`.
2. writes that record to `DerbyDist` with `PutItem`;
3. publishes that record to `derby/{orgId}/dist`.

Consequently, a ten-record Lambda invocation can perform ten `DerbyDist` writes and ten IoT publishes. The batching-window comment in `backend/dynamo.tf` describes an intended consolidation that is not implemented.

## Proposed envelope

Group valid stream records by `orgId`, preserving their order within the received Lambda batch. Create one envelope for each group:

```json
{
  "format": "derby-distribution-v2",
  "orgId": "Test.12345",
  "sequence": 4821,
  "sourceEventIds": ["event-1", "event-2"],
  "records": [
    { "PK": "Test.12345:Race", "SK": "1" },
    { "PK": "Test.12345:RP", "SK": "2" }
  ]
}
```

The envelope is both the stored replay unit and the MQTT payload. `sourceEventIds` supports diagnostics and later idempotency work.

## Storage layout

Do not mix the new contiguous sequence with the existing epoch-microsecond `DS` namespace. Use a versioned distribution partition:

```text
Envelope: DP = "v2#<orgId>",      DS = <sequence>
Counter:  DP = "v2-counter#<orgId>", DS = 0
```

`DS` remains numeric, matching the current `DerbyDist` schema. Separating the counter partition also prevents ordinary event-history queries from returning the counter item.

During migration, readers query both the legacy `DP = <orgId>` partition and the new `DP = v2#<orgId>` partition. New clients understand both individual legacy records and v2 envelopes.

## Contiguous sequence allocation

An atomic increment followed by a separate `PutItem` is insufficient: if the put fails after the increment, the sequence contains a gap. Instead, allocate the number and store its envelope in one DynamoDB transaction.

For each organization group:

1. Perform a strongly consistent `GetItem` for `DP = v2-counter#<orgId>, DS = 0`.
2. Let `current` be its stored sequence, or zero when it does not exist.
3. Let `next = current + 1`.
4. Submit one `TransactWriteItems` request containing:
   - a conditional counter update from `current` to `next`; and
   - a conditional envelope put at `DP = v2#<orgId>, DS = next`.
5. If the counter condition fails because another writer advanced it, reread and retry with bounded exponential backoff.
6. Publish the committed envelope to MQTT only after the transaction succeeds.

The counter update and envelope put either both commit or neither commits. Therefore a failed transaction cannot consume a sequence number, and committed envelopes remain contiguous.

The existing reserved Lambda concurrency of one makes contention unlikely but is not the correctness mechanism. The transaction remains correct if concurrency is increased or another producer is introduced.

## Failure semantics

Contiguous storage does not by itself provide exactly-once processing:

- If the transaction fails, no sequence is consumed; retrying is safe.
- If the transaction commits but MQTT publish fails, the envelope remains in `DerbyDist`. A client that later observes a higher sequence detects the missing delivery and reloads/replays from HTTP.
- If Lambda retries an already committed source batch, it can create a second, contiguous envelope containing duplicate logical records unless idempotency is added.

For the first version, consumers must continue treating entity updates as idempotent and use `sourceEventIds` for diagnosis. If exact-once envelope creation is required, add a durable batch-idempotency record to the same transaction. Do not rely solely on the `TransactWriteItems` client token because its idempotency window is finite.

Errors must not be swallowed before the transaction commits. Transaction failures should fail the Lambda invocation so the stream batch is retried. MQTT failure may either fail the invocation or be repaired through sequence-gap replay; that policy must be explicit and tested.

## Payload limits and splitting

A Lambda batch may contain records for multiple organizations, and a single organization’s group may still be too large for DynamoDB or IoT. Before allocating a sequence:

1. serialize the candidate envelope;
2. split its records into ordered sub-envelopes when it exceeds the configured safe payload threshold;
3. allocate and commit one consecutive sequence for each sub-envelope; and
4. publish them in sequence order.

The threshold should remain below both services’ limits and leave room for envelope metadata. Splitting must happen before sequence allocation so each committed sequence corresponds to one valid stored and publishable envelope.

## Client changes

Deploy client support before the backend begins publishing v2 envelopes. `HotLoad.svelte` currently parses one JSON object and passes it directly to `EntityFactory.build()`.

The new message path should:

1. recognize `format === "derby-distribution-v2"`;
2. track the last applied v2 sequence per organization;
3. ignore an already-applied sequence;
4. trigger HTTP replay when `sequence > lastSequence + 1`;
5. apply every envelope record in array order; and
6. retain support for legacy single-record payloads throughout migration.

HTTP distribution loading must similarly flatten legacy records and v2 envelopes into the existing entity-application path. Persisting the last sequence locally is useful for diagnostics, but the HTTP snapshot remains authoritative after reconnect or a detected gap.

Old cached clients cannot parse an envelope. Gate backend emission with a deployment variable or feature flag until the compatible frontend is deployed and the chosen stale-client policy is satisfied.

## Code scope

### Backend

- `backend/modules/lambdaDynamo/src/dynamoMain.js`
  - replace per-record propagation with validation, grouping, splitting, transactional sequence allocation, envelope persistence, and ordered publishing;
  - retain source order within each organization;
  - make storage failures retryable rather than best-effort.
- `backend/modules/lambdaDynamo/src/dynamoMain.test.js`
  - cover multiple records for one organization;
  - cover multiple organizations in one stream batch;
  - verify contiguous allocation and conditional-conflict retry;
  - verify transaction failure consumes no number;
  - verify payload splitting and publish order;
  - verify malformed, `REMOVE`, and missing-organization records remain non-blocking where appropriate.
- `backend/modules/lambdaDynamo/main.tf`
  - add `dynamodb:TransactWriteItems` and any required consistent-read permission;
  - add rollout configuration/feature flag.
- `backend/dynamo.tf`
  - update the batching comment to describe the implemented behavior.

### Frontend

- `frontend/src/HotLoad.svelte`
  - accept legacy records and v2 envelopes;
  - apply envelope records in order;
  - detect duplicate and missing sequences;
  - reconcile gaps via the existing HTTP refresh path.
- Distribution HTTP parsing/loading code
  - query and merge legacy and v2 partitions during migration;
  - flatten envelopes before entity construction.
- Tests and integration fixtures
  - cover mixed legacy/v2 history and messages;
  - replace assumptions that one source update always produces one MQTT message.

## Delivery sequence

1. Add dual-format frontend and HTTP-reader support; keep backend output legacy.
2. Deploy and validate the compatible frontend.
3. Add transactional v2 envelope creation behind a disabled feature flag.
4. Enable v2 in a test environment and verify storage/MQTT parity, contiguous sequences, gap recovery, and payload splitting.
5. Enable v2 gradually in production while retaining legacy read support.
6. After the stale-client retention period, decide whether legacy writes and dual-partition reads can be retired.

## Acceptance criteria

- For each organization, committed v2 envelope sequences begin at 1 and contain no gaps.
- A failed transaction does not advance the counter.
- One Lambda event may safely produce envelopes for multiple organizations.
- Oversized groups split into consecutively numbered, valid envelopes.
- The stored envelope and MQTT payload are byte-for-byte equivalent or are generated from the same immutable object.
- New clients process legacy records and v2 envelopes.
- A missing sequence causes deterministic HTTP reconciliation.
- Existing cached clients are protected by the rollout gate.
- Automated tests cover transaction conflicts, retries, duplicate delivery, gaps, and mixed-format replay.
