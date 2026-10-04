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

`dynamoMain.js` is not the only writer into the legacy `DP = <orgId>` partition. `backend/modules/lambdaSqs/src/ccaMain.js` writes `DP = orgId, DS = <epoch-microseconds>` items directly to `DerbyDist` during bulk/CCA reloads (`putS3`, `addBulk`/`flushBulkRequests`), and has its own independent `ddbQueryRaceHistory()` reader of the same partition. Any migration plan for this partition has to account for that second producer, not just `dynamoMain.js`.

## Observed first-load gap (2026-10-04)

The current pipeline has a visible symptom that the sequence design below should be judged against: a record written a few seconds before a client opens the event can be missing from that client's first load, and in the cases measured the live feed did not fill it in.

**How it was found.** The new Playwright flows (`frontend/e2e/`, see `SvelteUpgradeProposal.md`) create an event and its drivers through the API, then open the event in the browser. The "drivers are available once the event is selected" test failed intermittently: typing a car number on the Add Blocks form showed "Unknown Racer" instead of the driver's name, for the full 15-second wait.

**What was measured** (against `test.rr1.us`, 3 drivers created per event, then the event opened right away):

- 4 failures in 55 runs (1 of 15, then 3 of 40), about 7%. Those runs were 3 or 4 at a time; 4 runs on their own all passed, which is too few to say whether parallel load matters.
- In every failing run the app's own `GET /getRaceHistory?orgId=...&orgIz=...` returned HTTP 200 with **zero** participants. The response headers were `x-cache: Miss from cloudfront` and `cache-control: max-age=7`, so it was not a stale CDN copy. In the runs that did not fail the same request returned all 3.
- The same URL requested again moments later, and a cache-busted copy, returned all 3 participants in every failing run. The data was written and readable shortly after; it was just not in the table that request read.
- The page text in the failing runs showed nothing from the live feed either (no driver names), for the 15 seconds the test waited.

**Why the first read can miss.** `getRaceHistory` does not read `DerbyMain`; it queries `DerbyDist` (`DistDbTable`, `DP = orgId`, `DS BETWEEN loMicros AND hiMicros`) in `DdbUtils.ddbQueryRaceHistory`. A record only reaches that table after it passes through the stream and the `dynamoMain` Lambda described above (up to a two-second batching window, plus Lambda start-up and the per-record `PutItem` writes), so a read shortly after a write can precede the distribution write. That is expected from the pipeline's design and not a defect in a single step.

**What was not established.** The runs did not capture whether the browser's MQTT subscription was active when the record was published, so it is not known why the live feed did not supply the missing drivers. The candidates, all consistent with the symptom, are: the subscription had not yet been confirmed when the record was published (`HotLoad.svelte` waits up to `mqttInitialConnectTimeoutMs` = 5 seconds, then takes the HTTP snapshot anyway and reconciles once the subscription is confirmed), the record was published before the subscription but after the snapshot's read was already decided, or the message arrived and was dropped on the way into the store. Instrumenting `HotLoad` (subscription-confirmed time, each message received, each snapshot's entity count) on a failing run is the first step before relying on any of the explanations below.

**Why this matters for this proposal.** The sequence design makes a *detected* gap recoverable: a client that sees `sequence > lastSequence + 1` replays over HTTP. It does not by itself cover the case seen here, where the missing record is the *latest* one, because with nothing newer arriving there is no later envelope to reveal the gap. Closing it needs one more rule in "Client changes" below.

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

The two partitions use incompatible `DS` numbering (epoch-microseconds vs. a small integer starting at 1), so results cannot be merged by a single numeric sort on `DS`. Every v2 envelope is chronologically newer than every legacy record for that organization, by construction: v2 writes only begin once the feature flag is enabled for that org, after which `ccaMain.js`'s bulk-reload path must also stop writing to the legacy partition for that org (see Code scope). Readers must therefore order results as *all legacy records (by `DS`), followed by all v2 envelopes (by `sequence`)* — never interleaved by raw numeric `DS` comparison across the two partitions.

## Contiguous sequence allocation

An atomic increment followed by a separate `PutItem` is insufficient: if the put fails after the increment, the sequence contains a gap. Instead, allocate the number and store its envelope in one DynamoDB transaction.

For each organization group:

1. Perform a strongly consistent `GetItem` for `DP = v2-counter#<orgId>, DS = 0`.
2. Let `current` be its stored sequence, or zero when it does not exist.
3. Let `next = current + 1`.
4. Submit one `TransactWriteItems` request containing:
   - a counter update conditioned on `SequenceValue = current` (or `attribute_not_exists(DP)` when `current` is zero) — a compare-and-swap on the exact value just read, not merely "the item exists"; and
   - an envelope put at `DP = v2#<orgId>, DS = next` conditioned on `attribute_not_exists(DS)` as a backstop against double-writing the same sequence.
5. If either condition fails because another writer advanced the counter, reread and retry with bounded exponential backoff.
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

Each sub-envelope is allocated and committed via its own `TransactWriteItems` (step 4 of sequence allocation, above), so a group that splits into N sub-envelopes performs N separate transactions within one Lambda invocation. If a later sub-envelope's transaction fails, the invocation fails and the whole stream batch retries per the failure policy below — but a naive retry would re-split the same source records and re-allocate *new* sequences for sub-envelopes that already committed successfully before the failure, producing duplicates distinct from the whole-batch-retry case already covered. To prevent this, each sub-envelope's put must additionally be conditioned on `attribute_not_exists` for a deterministic idempotency key derived from `(sourceEventIds, subIndex)`; before allocating a sequence for a sub-envelope, check whether that key already has a committed envelope for this organization and skip re-allocation if so, resuming the split from the first sub-envelope not yet committed.

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

The HTTP snapshot response must include, per organization, the v2 `sequence` of the newest envelope reflected in that snapshot, and the client must seed `lastSequence` from that value before subscribing to live MQTT envelopes — not default it to `0`/undefined. Without an explicit seed, a client's first live envelope after a snapshot (e.g. `sequence = 4821` for an established org) would always satisfy `sequence > lastSequence + 1` and trigger replay, and if the replay path doesn't set `lastSequence` either, this repeats on every subsequent envelope.

**Closing the first-load gap.** Once the HTTP snapshot carries the newest reflected `sequence`, a client can also detect a missing *latest* envelope without waiting for a newer one: after the live subscription is confirmed, ask the backend for the organization's current head sequence (a small read of the counter, or a `head` field on a cheap endpoint) and replay over HTTP if it is greater than `lastSequence`. Do this once after the subscription is confirmed and again if the head read races a write (a bounded retry after the two-second batching window plus margin), not on a timer for the life of the page. Legacy-format organizations have no counter to compare, so for them the existing reconcile-after-subscription refresh stays the only protection and the first-load gap remains until they are switched to v2.

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
- `backend/modules/lambdaDerby/src/DdbUtils.js`
  - `ddbQueryRaceHistory()` is the actual HTTP-side reader of `DerbyDist` (called by `derbyMain.js`'s `/getRaceHistory` route, in turn called by `HotLoad.svelte`); update it to query both partitions and apply the legacy/v2 merge-ordering rule from Storage layout, and to return the seed `sequence` value described in Client changes.
- `backend/modules/lambdaSqs/src/ccaMain.js`
  - stop writing directly to the legacy `DP = orgId` partition for organizations that have been switched to v2, once switched;
  - update its independent, duplicate `ddbQueryRaceHistory()` to apply the same merge-ordering rule, or delegate to `DdbUtils.js`'s implementation instead of duplicating it.
- `backend/test/runIntegrationTests.js`
  - update `expectedMqttMessageCount` and the per-message `PK`/`SK` shape assertions on the `derby/{orgId}/dist` topic, which currently assume exactly one MQTT message per source record.

### Frontend

- `frontend/src/HotLoad.svelte`
  - accept legacy records and v2 envelopes;
  - apply envelope records in order;
  - detect duplicate and missing sequences;
  - reconcile gaps via the existing HTTP refresh path.
- Distribution HTTP response handling in `HotLoad.svelte`
  - flatten the legacy/v2 mix returned by `DdbUtils.js` (already ordered) into the existing entity-application path;
  - seed `lastSequence` per organization from the snapshot's returned sequence before subscribing to live envelopes.
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
- Oversized groups split into consecutively numbered, valid envelopes, and a retried invocation does not re-allocate sequences for sub-envelopes already committed in a prior attempt.
- The stored envelope and MQTT payload are byte-for-byte equivalent or are generated from the same immutable object.
- New clients process legacy records and v2 envelopes, merged in the specified legacy-then-v2 order, never interleaved by raw numeric `DS`.
- A client seeds `lastSequence` from its HTTP snapshot and does not spuriously replay on its first live envelope.
- A missing sequence causes deterministic HTTP reconciliation.
- `ccaMain.js` does not write to the legacy partition for an organization once that organization is switched to v2.
- Existing cached clients are protected by the rollout gate.
- Automated tests cover transaction conflicts, retries, duplicate delivery, gaps, and mixed-format replay.
- A client that opens an organization immediately after a record was written shows that record without a manual refresh. The Playwright flows' `waitForHistory` setup step (in `frontend/e2e/support/fixture.js`) exists only to work around this gap; once it is closed, an e2e that opens the event with no wait, run in parallel at least 40 times with no failure, is the check, and the wait can be removed.
