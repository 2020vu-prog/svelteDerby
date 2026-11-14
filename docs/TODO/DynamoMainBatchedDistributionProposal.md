# Proposal: batched `dynamoMain` distribution with contiguous sequences

Date: 2026-09-08. Revised 2026-11-13 after review (sequence-range reads, idempotency, publish policy, replay API, frozen legacy events, retained head messages, single conditional-put allocation).

## Objective

Replace the current one-source-record/one-`DerbyDist`-item/one-MQTT-message flow with one ordered envelope per event for each batch consumed from SQS. Persist the full envelope and publish it inline when it fits, and give new envelopes contiguous per-event sequence numbers.

Two goals, kept separate:

1. **Fewer writes and publishes.** A ten-record invocation currently performs ten `DerbyDist` writes and ten IoT publishes. After this change it performs one conditional write and one publish per event (more only when splitting), with the head read served from an in-memory cache except after a cold start or a conflict. The saving depends on how many records a real batch holds, which has not been measured: the 10-record cap and 2-second window mean live traffic may often be one or two records per batch. Measure typical batch size per invocation before treating this goal as a benefit; the gap-detection and replay goal does not depend on it.
2. **Exact gap detection and targeted replay.** A client that misses an envelope can detect it and fetch precisely what it missed (`sequence > lastSequence`), with no clock involved.

“Contiguous” means that committed v2 envelopes for one event are numbered `1, 2, 3, ...` without gaps. It does not imply ordering between events, and it cannot be applied retroactively to the existing epoch-microsecond `DS` records.

Assumption: events that exist when this change is installed are frozen. They need no live distribution and no coexistence with v2; they only need to remain loadable in full from the legacy partition. Events created afterwards are v2 only.

This proposal also closes the first-load gap described below, using retained head messages and sequence replay. It does not make a freshly written record appear instantly; the pipeline latency (a few seconds) remains.

## Current behavior

The DynamoDB event-source mapping collects up to 10 `DerbyMain` stream records, with a maximum batching window of two seconds. `dynamoMain.handler` still processes those records individually. For every valid record it:

1. Creates a distribution record with `DP = orgId` and an epoch-microsecond `DS`.
2. writes that record to `DerbyDist` with `PutItem`;
3. publishes that record to `derby/{orgId}/dist`.

The batching-window comment in `backend/dynamo.tf` describes an intended consolidation that is not implemented.

`dynamoMain.js` is not the only writer into the legacy `DP = <orgId>` partition. `backend/modules/lambdaSqs/src/ccaMain.js` writes `DP = orgId, DS = <epoch-microseconds>` items directly to `DerbyDist` during bulk/CCA reloads (`putS3`, `addBulk`/`flushBulkRequests`), and has its own independent `ddbQueryRaceHistory()` reader of the same partition. Any migration plan for this partition has to account for that second producer.

## Observed first-load gap (2026-10-04)

A record written a few seconds before a client opens the event can be missing from that client's first load, and in the cases measured the live feed did not fill it in.

**How it was found.** The Playwright flows (`frontend/e2e/`, see `SvelteUpgradeProposal.md`) create an event and its drivers through the API, then open the event in the browser. The "drivers are available once the event is selected" test failed intermittently: typing a car number on the Add Blocks form showed "Unknown Racer" instead of the driver's name, for the full 15-second wait.

**What was measured** (against `test.rr1.us`, 3 drivers created per event, then the event opened right away):

- 4 failures in 55 runs (1 of 15, then 3 of 40), about 7%. Those runs were 3 or 4 at a time; 4 runs on their own all passed, which is too few to say whether parallel load matters.
- In every failing run the app's own `GET /getRaceHistory?orgId=...&orgIz=...` returned HTTP 200 with **zero** participants. The response headers were `x-cache: Miss from cloudfront` and `cache-control: max-age=7`, so it was not a stale CDN copy. In the runs that did not fail the same request returned all 3.
- The same URL requested again moments later, and a cache-busted copy, returned all 3 participants in every failing run. The data was written and readable shortly after; it was just not in the table that request read.
- The page text in the failing runs showed nothing from the live feed either (no driver names), for the 15 seconds the test waited.

**Why the first read can miss.** `getRaceHistory` does not read `DerbyMain`; it queries `DerbyDist` (`DP = orgId`, `DS BETWEEN loMicros AND hiMicros`) in `DdbUtils.ddbQueryRaceHistory`. A record only reaches that table after it passes through the stream and the `dynamoMain` Lambda (up to a two-second batching window, plus Lambda start-up and the per-record `PutItem` writes), so a read shortly after a write can precede the distribution write.

**What was not established.** The runs did not capture whether the browser's MQTT subscription was active when the record was published, so it is not known why the live feed did not supply the missing drivers. Candidates: the subscription had not been confirmed when the record was published (`HotLoad.svelte` waits up to `mqttInitialConnectTimeoutMs` = 5 seconds, then takes the HTTP snapshot anyway and reconciles once the subscription is confirmed); the record was published before the subscription but after the snapshot's read was already decided; or the message arrived and was dropped on the way into the store. One plausible combined explanation: the reconcile refresh after subscription ran before the Lambda had committed, and the publish had already happened before the subscription was live, so neither path saw the record.

**Relationship to this proposal.** A record that is committed but not yet distributed is not lost: when the Lambda runs it is published, and a client that is subscribed by then receives it live. It is lost only if it is published _before_ the client's subscription is live and the snapshot, read earlier, did not include it. The first-load gap is therefore closed by making sure every committed envelope reaches the client by one of three routes, with no timer and no source-of-truth watermark:

1. **Subscribe first.** The client subscribes and confirms, buffering live messages, _before_ taking the snapshot; it then applies the snapshot and the buffer, ignoring duplicates by sequence (for a legacy event, which carries no sequence, duplicates are harmless because entity application is idempotent). Verify what `HotLoad` does today. If it already does this, the dropped live message is the bug to find.
2. **Retained head message.** Each envelope is published with the MQTT retain flag, so a new subscriber immediately receives the latest envelope for the event (see Retained head message below).
3. **Sequence replay.** If the retained or live envelope is more than one ahead of the client's `lastSequence`, the client fetches the missing envelopes through the replay API.

A record written moments before a client opens is eventual, not instant: it appears once the pipeline has distributed it (a few seconds). The acceptance criterion is bounded eventual presence (see Acceptance criteria).

Step 0 (Delivery sequence) covers the part independent of v2: instrument `HotLoad` (subscription-confirmed time, each message received, each snapshot's entity count) on a failing run, and fix the client ordering. A timed second reconcile is explicitly rejected: it only narrows the window, makes the failure rarer and harder to reproduce, and leaves the race in place.

## Proposed envelope

DynamoDB stream shards feed SQS. The Lambda consumes queued work sequentially, groups valid records by `orgId`, and preserves their order within the received batch. Create one envelope for each group:

```json
{
  "format": "derby-distribution-v2",
  "orgId": "Test.12345",
  "sequence": 4821,
  "committedMicros": 1790000000000000,
  "batchKey": "<sha256 hex of orgId, sourceEventIds, subIndex>",
  "sourceEventIds": ["event-1", "event-2"],
  "records": [
    { "PK": "Test.12345:Race", "SK": "1" },
    { "PK": "Test.12345:RP", "SK": "2" }
  ]
}
```

The envelope is the stored replay unit. MQTT carries either the same envelope or a fetch notice for its sequence. `committedMicros` is the commit time, kept for diagnostics only; nothing orders or queries by it. `batchKey` is the idempotency key (see Contiguous sequence allocation); `sourceEventIds` is a diagnostic and its input.

Ordering guarantee, stated precisely: envelopes are ordered by **commit order per event**. Records inside an envelope keep their order within the received Lambda batch. This does not promise source-write order across stream shards; that is no stronger than today's behavior. The SQS consumer Lambda assigns sequences after dequeue. See Retained head message for the queue ordering contract.

## Storage layout

Do not mix the new contiguous sequence with the existing epoch-microsecond `DS` namespace. Use a versioned distribution partition that holds only envelopes:

```text
Envelope: DP = "v2#<orgId>", DS = <sequence>
          attrs: committedMicros, batchKey, sourceEventIds, records
```

There is no separate counter or idempotency-marker item. The newest envelope is the head: its `DS` is the current sequence. `DS` stays numeric, matching the current `DerbyDist` schema. A separate partition keeps v2 out of ordinary event-history queries on the legacy partition.

**Retention:** the newest envelope for an event must never expire or be deleted. If it were, the next allocation would restart at 1 and collide with sequences clients have already applied. If `DerbyDist` has TTL, v2 envelopes need an explicit policy that preserves the head (open question 3).

### CCA checkpoints and CCF final archives

This is the existing CCA consolidation, ported to sequences. Today `getRaceHistory` requests a CCA when a read is expensive; `ccaMain.js` writes the consolidated history to S3, adds a `PK: "CCA"` pointer item with the `s3` key, deletes the consolidated `DerbyDist` items, and an optimistic lock allows one CCA per window. The client reads the pointer and fetches the S3 object itself (`HotLoad.svelte` `loadCcaHistory`). First load is therefore a pointer plus a recent tail, and without an equivalent for v2 both first load and the partition would grow with the event. v2 keeps the same trigger, lock and client flow, with the pointer carrying the highest covered sequence. For v2, the pointer identifies an immutable S3 object and the highest sequence `C` it fully covers. Start from the previous checkpoint and paginate through the contiguous DynamoDB range up to `C`. Publish the pointer only after the complete object is written. Prune only covered envelopes, preserving the latest envelope for sequence allocation and the recent lookback used for retries.

To build a snapshot, read the checkpoint and the DynamoDB tail from `C + 1` through the chosen head `H`. Use `C = 0` when there is no checkpoint. Pin the checkpoint and head across pages. If pruning removes part of a reader's pinned tail, restart from the latest checkpoint. Return the seed only after the snapshot has complete coverage.

Revise the v2 CCF path in `ccaMain.js` to use the same checkpoint-plus-tail reader. After event writes stop and queued distribution work drains, capture the final head and write a complete `archive.json` in the shape expected by the archived-event loader. The checkpoint and tail must preserve source entity revisions so archive reconstruction can apply the same stale-update rule. Keep the legacy archive reader for frozen events.

### Reads by sequence

v2 has no time-window read. The frontend never sends `loMicros` or `hiMicros` (`HotLoad.svelte` calls `getRaceHistory?orgId=...&orgIz=...`), so the server's default of "everything up to now" is the only mode in use for events. For a v2 event:

- **First load:** `getRaceHistory` returns the checkpoint pointer (the client fetches the S3 object, as with CCA today) and the remaining envelopes through seed `H` in sequence order.
- **Gap fill:** the replay API reads an explicit sequence range, so a client that knows which sequences are missing requests exactly those (see Replay API).

Both are `DS BETWEEN :lo AND :hi` on the v2 partition with `ConsistentRead = true`, a direct key condition. No timestamp lookup, binary search or index is needed. Verify no other caller (scripts, tests, other clients) sends a time window for an event (open question 5).

### Frozen legacy events

An event is entirely legacy or entirely v2; the two never mix. Events that exist when this change is installed are frozen: they receive no further writes, no live distribution, and are only ever loaded in full from the legacy `DP = <orgId>` partition by the existing query, unchanged. Events created afterwards use v2 only, from their first write. There is therefore no dual-partition read, no merge-ordering rule, and no per-event live switch.

The reader chooses the format per event (how the format is recorded is open question 1) and runs exactly one of the two paths. The legacy path is retained read-only for as long as frozen events must remain loadable.

## Contiguous sequence allocation

Each envelope is one conditional `PutItem` at `DS = headSequence + 1` with `attribute_not_exists(DS)`. Two writers racing for the same number collide instead of both succeeding, and a failed put consumes nothing, so committed envelopes remain contiguous without a counter item or a transaction.

`batchKey` is a SHA-256 hex digest of `(orgId, sourceEventIds, subIndex)` and is stored on the envelope. It is the idempotency key.

**Head cache.** The Lambda keeps, per event in memory, `{ headSequence, recentBatchKeys }` (batch key to sequence, for the last K envelopes). The cache is bounded (LRU with a size cap); eviction just costs one cold query. It is only a hint; correctness comes from the conditional put. A stale cache can never exceed the true head, so it can only attempt a number that already exists, which fails the condition. It cannot produce a gap or an overwrite. (This holds only while the head envelope is never deleted; see Retention.)

For each event group (or sub-envelope, see below):

1. **Load head state.** Use the cache if present. Otherwise (first write for the event after a cold start, or after a conflict) do one consistent `Query` of the newest K envelopes (`ScanIndexForward = false`, `Limit = K`, `ConsistentRead`), and fill `headSequence` and `recentBatchKeys`. An event with no envelopes has `headSequence = 0`.
2. **Idempotency check.** If `batchKey` is in `recentBatchKeys`, the envelope is already committed: `GetItem` it by its sequence and go to step 6. Do not allocate.
3. `next = headSequence + 1`; `committedMicros = now`.
4. `PutItem` the envelope at `DS = next` with `ConditionExpression = attribute_not_exists(DS)`.
5. **On success,** set `headSequence = next` and add `batchKey` to `recentBatchKeys`. **On `ConditionalCheckFailed`** (another writer took `next`, or the cache was stale) **or a timeout or network error** (unknown outcome): discard the event's cache entry and return to step 1, with bounded exponential backoff. The fresh lookback in step 1 also detects that this very put had in fact committed.
6. Publish the committed envelope to MQTT.

**Lookback bound.** The idempotency check sees only the newest K envelopes. A batch retried after more than K other envelopes have committed would be written again as a duplicate envelope. That is tolerated, because the client checks each source entity revision, even when the retry has a new envelope sequence. K must also be at least the largest number of sub-envelopes a single group can split into, or a retried split cannot see its own earlier sub-envelopes. The cold-start query cost scales with K and envelope size (RCUs are charged on item size, not projection), so K is tuned small (open question 6).

The SQS consumer processes each event sequentially and resolves publish retries before advancing to later work for that event. Preserve that ordering across invocations and redelivery. A concurrency limit can serialize invocations, while the queue and consumer must enforce the retry ordering.

## Failure semantics

- If the put fails, no sequence is consumed; retrying is safe.
- **Policy: a publish failure fails the queued work.** On retry, use the stored envelope when the batch key is found and retry its MQTT publication. Live delivery depends on IoT availability. If retries are exhausted, send the failed work to the dead-letter queue and record the event and sequence. After service recovers, a snapshot refresh reads committed data. Any operator redrive must preserve the retained head ordering.
- Storage errors must not be swallowed. They fail the invocation.
- Malformed, `REMOVE`, and records missing an `orgId` remain non-blocking and are skipped before grouping.
- HotLoad compares source entity revisions to suppress stale updates and duplicate records.
- Configure queue redelivery and dead-letter handling. Keep the batch identity and split boundaries stable across retries so the stored envelopes can be found by batch key.

## Payload limits and splitting

The binding limit is IoT's 128 KB message size, not DynamoDB's 400 KB item size. Before allocating a sequence:

1. serialize the candidate envelope;
2. split its records into ordered sub-envelopes when it exceeds the configured safe threshold (set from the IoT limit, leaving room for metadata and topic overhead);
3. allocate and commit one consecutive sequence for each sub-envelope through its own conditional put; and
4. publish them in sequence order.

Splitting happens before sequence allocation, so each committed sequence can be published inline or represented by a fetch notice. Splitting must be deterministic for a given batch (same records, same threshold, same `subIndex` assignment) so the `batchKey` for `(sourceEventIds, subIndex)` identifies the same sub-envelope on retry. A retry reuses committed sub-envelopes found in the lookback, then allocates any remaining sequences. Apply the retained head ordering rule when retrying publication.

If one record exceeds the MQTT threshold, commit it as its own sequence and publish a small retained v2 notice with `orgId`, `sequence`, and `fetchRequired: true`. Check that the full stored envelope fits DynamoDB including metadata. If it does not fit, store the payload under an immutable S3 key before committing a DynamoDB envelope with its reference. The replay and snapshot readers resolve that reference, and checkpointing preserves its contents before cleanup.

## Client changes

Deploy client support before the backend begins publishing v2 envelopes. `HotLoad.svelte` currently parses one JSON object and passes it directly to `EntityFactory.build()`.

The new message path should:

1. recognize `format === "derby-distribution-v2"`;
2. track the last applied v2 sequence per event (`lastSequence`);
3. ignore a sequence `<= lastSequence`;
4. when `sequence > lastSequence + 1`, fetch the missing envelopes with the replay API (below), apply them in order, then apply the live envelope;
5. for a fetch notice, replay from `lastSequence + 1` through the advertised sequence inclusive, even when the notice is the next expected sequence; and
6. load frozen legacy events from their snapshot only. Legacy single-record live payloads need no support because frozen events receive no live messages.

### Source entity revisions

Assign a monotonically increasing revision per entity at the original write and preserve it through SQS, envelopes, replay, and archives. HotLoad compares each v2 record's revision with the revision stored in Dexie for that entity. Apply newer revisions in array order and skip equal or older revisions. Persist the accepted revision with the entity update. If a deletion is represented as a record, preserve its revision as a tombstone to prevent an old retry from restoring it. Advance `lastSequence` only after successfully processing the envelope, including when all its records were skipped. A fetch notice advances the cursor only after replay has processed the advertised sequence.

### Seeding `lastSequence`

The HTTP snapshot returns, per event, a `sequence` seed `H`. The client subscribes first, buffering live messages (including the retained head), then loads the snapshot and sets `lastSequence = H`. Buffered messages go through the same live message path after seeding, including fetch notices. Without the seed, the first live envelope after a snapshot would always satisfy `sequence > lastSequence + 1`.

The seed is computed so it cannot disagree with the data returned: the reader first does a consistent `Query` for the newest envelope (`H` is its `DS`, or 0), then loads the checkpoint and queries the remaining envelopes only up to `H`. Envelopes committed after that read are eligible for live delivery, retained delivery, or replay. With pagination, `H` is read once on the first page and carried on subsequent pages. The reader does not use the writer's in-memory cache. `getRaceHistory` is cached for 7 seconds, but `H` and its data come from the same response, so they stay consistent; a stale `H` only means the client replays a few more envelopes.

### Replay API

A new route, for example `GET /getDist?orgId=...&fromSequence=LO&toSequence=HI`:

- returns the v2 envelopes with `LO <= sequence <= HI` in order, with consistent reads. `toSequence` is optional and defaults to the current head;
- is what a client calls with exactly the sequences it knows are missing: for an inline envelope ahead of the next expected sequence, request `lastSequence + 1` through `sequence - 1`. For a fetch notice, request through `sequence` inclusive;
- is paginated at the DynamoDB 1 MB query limit and returns a continuation token;
- returns only sequences that exist; a requested number above the head is simply absent;
- is served with `Cache-Control: no-store` or otherwise bypasses the 7-second CloudFront cache that `getRaceHistory` uses, since a cached gap-fill defeats the purpose;
- falls back to instructing the client to reload the snapshot when `fromSequence` is older than retention or the range exceeds a configured size.

Snapshot loading flattens the event's records (legacy records, or v2 envelopes in sequence order) into the existing entity-application path. The HTTP snapshot is the starting point for a first load. On an MQTT reconnect the client does not reload the snapshot: resubscribing delivers the retained head, and the client handles it as above, replaying any missing envelopes. It reloads the snapshot only when the replay API says the gap is too large or too old.

**Ordered apply.** The client applies buffered messages, the retained head, replay results and live envelopes through one ordered queue keyed by sequence, so a replay response can never interleave with a live envelope or be applied after a newer one.

### Retained head message

Every inline envelope or fetch notice is published with the retain flag, so the retained message on `derby/{orgId}/dist` identifies the highest successfully published sequence for the event. On subscribe, a client receives it immediately and compares its `sequence` to `lastSequence`:

- `sequence <= lastSequence`: already applied; ignore.
- Fetch notice above `lastSequence`: replay through the advertised sequence inclusive.
- Inline envelope with `sequence == lastSequence + 1`: apply.
- `sequence > lastSequence + 1`: fetch the missing envelopes through the replay API, then apply.

This covers an envelope published before the subscription was live, and replaces a separate head-read endpoint. It does not need a timer. It does not apply to frozen legacy events, which have no live feed.

Caveats and requirements:

- **Publish ordering:** process SQS work and retries in event order. When resuming partially published work or redriving it after later work has succeeded, do not republish an older sequence as the retained head. Republish the current committed head through the same serialized consumer when repair is needed.
- **Splitting:** sub-envelopes are published in sequence order, so the final retained message is the highest sequence.
- **IAM:** publishing with retain needs `iot:RetainPublish` in addition to publish; verify.
- **Lifecycle:** retained messages persist until cleared, leaving one per event topic. Check IoT retained-message quotas and pricing and decide whether to clear a topic when an event ends.
- **Size:** the 128 KB message limit applies to retained messages.

### Cutover and stale clients

Deploy the compatible frontend first (Delivery steps 1-2). The cutover is then a single backend deployment after which newly created events are v2. Because an event is exclusively one format, v2 envelopes use the existing `derby/{orgId}/dist` topic; no new topic is needed.

Cutover happens when no event is live, because every existing event becomes frozen at that moment and receives no further writes or live distribution. The e2e flows on `test.rr1.us` create events through the API, so they exercise legacy behavior before cutover and v2 after it; run them against the post-cutover deployment.

A stale cached client that opens a v2 event cannot parse envelopes. Legacy events are unaffected, since they are frozen and loaded from the snapshot. Decide whether that exposure is acceptable (it is limited to events created after cutover, opened by a client that missed the frontend update) or whether the snapshot should carry a minimum client version (open question 7).

## Code scope

### Backend

- `backend/modules/lambdaDynamo/src/dynamoMain.js`
  - replace per-record propagation with validation, grouping, deterministic splitting, cached head state, idempotency check, conditional-put allocation, and ordered publishing;
  - retain source order within each event;
  - make storage failures retryable and publish failures fail the invocation.
- `backend/modules/lambdaDynamo/src/dynamoMain.test.js`
  - multiple records for one event;
  - multiple events in one stream batch, including partial failure (event A commits, event B fails, retry does not duplicate A);
  - contiguous allocation and conditional-conflict retry;
  - a failed put consumes no number;
  - a stale cache fails the condition and recovers by re-querying, with no gap or overwrite;
  - cold start queries the head once, and later writes use the cache;
  - unknown-outcome put (committed but reported as an error) does not duplicate within the lookback;
  - payload splitting, deterministic `subIndex`, resume after partial sub-envelope commit, K at least the max split count, and publish order;
  - publish failure fails the invocation and the retry republishes the stored envelope;
  - malformed, `REMOVE`, and records missing an `orgId` remain non-blocking.
- `backend/modules/lambdaDynamo/main.tf`
  - grant `iot:RetainPublish` for retained head messages (verify), and `dynamodb:PutItem`, `dynamodb:Query` and `dynamodb:GetItem` on the table. No transaction permissions are needed; strong consistency is a request parameter;
  - add the cutover configuration (open question 1).
- `backend/dynamo.tf`
  - configure the stream-to-SQS handoff and sequential consumer, document retry ordering, and configure dead-letter handling.
- `backend/modules/lambdaDerby/src/DdbUtils.js`
  - update `ddbQueryRaceHistory()` to select the legacy or v2 path by the event's format; the legacy path is unchanged, and the v2 path returns the checkpoint and tail through seed `H`, per the Seeding section;
  - add the replay query for the new route.
- `backend/modules/lambdaDerby/src/derbyMain.js`
  - add the replay route.
- `backend/modules/lambdaDerby/src/shared/permissionLits.js`
  - add the replay route to the same route lists that `/getRaceHistory` appears in (it is in two), or it will not authorize.
- Terraform for the replay route (the API and CloudFront configuration files, to be located)
  - add a CloudFront behavior for `getDist` with caching disabled (or `no-store` honored), separate from the cached `getRaceHistory` behavior, plus any API Gateway or Lambda routing and IAM it needs.
- `backend/modules/lambdaSqs/src/ccaMain.js`
  - stop writing directly to the legacy partition for any event; frozen events are never written, and the destination of bulk/CCA reload data for new events is open question 2;
  - share the paginated v2 checkpoint and tail reader with `DdbUtils.js` and use it to produce the final CCF archive after the queue drains.
- `backend/test/runIntegrationTests.js`
  - update `expectedMqttMessageCount` and the per-message `PK`/`SK` shape assertions on the `derby/{orgId}/dist` topic, which assume exactly one MQTT message per source record.

### Frontend

- `frontend/src/HotLoad.svelte`
  - accept v2 envelopes live, and load frozen legacy events from the snapshot;
  - apply envelope records in order with the Dexie revision guard and resolve fetch notices through replay;
  - detect duplicate and missing sequences and fill gaps via the replay API;
  - seed `lastSequence` from the snapshot.
- Tests and integration fixtures
  - loading a frozen legacy event in full, and a v2 event with live envelopes (never mixed);
  - replace assumptions that one source update always produces one MQTT message.

## Open questions

1. How is an event's format recorded and decided: a field set at event creation, or whether any v2 envelope exists for it? How is the freeze enforced (reject writes to legacy events at the API), and what does `dynamoMain` do if a stream record arrives for a frozen event (drop and log)?
2. Where does `ccaMain.js` bulk/CCA reload data go for new events, and why does it currently bypass `DerbyMain` and the stream? If it must go through sequence allocation, the allocation code needs to be shared.
3. Choose checkpoint frequency and confirm how `DerbyDist` TTL interacts with pruning. Preserve the head and retry lookback.
4. Choose the SQS queue and consumer settings that enforce per-event ordering, stable retries, and dead-letter handling.
5. Confirm no caller sends `loMicros` or `hiMicros` for an event (scripts, tests, other clients); if one does, decide whether v2 needs a time window at all.
6. Batch-size measurement, lookback size K and cache sizing: record the distribution of records per invocation and per event on real traffic. K trades duplicate-envelope risk against cold-query read cost (which scales with envelope size), so also measure typical envelope sizes.
7. Stale-client policy for v2 events: accept the limited exposure, or add a minimum client version to the snapshot.
8. Retained-message quotas, pricing and cleanup when an event ends.
9. Archived events: how does `loadArchivedData` (`HotLoad.svelte`) obtain archived data, and does the archiving process read the legacy `DerbyDist` partition? If so, v2 events need the same support when archived. A search found only `dynamo.tf`, `lambdaDynamo`, `lambdaDerby/DdbUtils.js` and `lambdaSqs/ccaMain.js` referencing `DerbyDist`, so any archiver reads it indirectly or by another route; confirm.

## Delivery sequence

0. **First-load gap, client part (independent of v2):** instrument `HotLoad`, establish why the live feed did not supply the record, and implement subscribe-first with buffering. No timer-based workaround. The retained head message and replay (the rest of the fix) arrive with v2.
1. Add frontend and HTTP-reader support for v2 events and frozen legacy events, including the replay route; backend output stays legacy.
2. Deploy and validate the compatible frontend.
3. Add conditional-put v2 envelope creation, used only for events created after cutover.
4. Cut over in a test environment and verify contiguous sequences, gap recovery, replay, oversized records, checkpoint reload, CCF final archives, and full loading of legacy events.
5. Cut over in production; existing events become frozen.
6. Remove the legacy write paths in `dynamoMain.js` and `ccaMain.js` at cutover. Keep the legacy read path for as long as frozen events must remain loadable.

## Acceptance criteria

- For each event, committed v2 envelope sequences begin at 1 and contain no gaps.
- A failed conditional put consumes no sequence number, a stale head cache never produces a gap or an overwrite, and an unknown-outcome put does not produce a duplicate envelope within the lookback.
- One Lambda invocation may safely produce envelopes for multiple events; a retry after partial failure creates no duplicates.
- Oversized groups split into consecutively numbered, valid envelopes, and a retried invocation does not re-allocate sequences for sub-envelopes already committed within the lookback.
- A publish failure retries the stored envelope in event order. Partial-batch retries and dead-letter redrive do not move the retained sequence backward.
- An oversized final update is recoverable from its retained fetch notice on live delivery and reconnect without a subsequent publish.
- `getRaceHistory` rebuilds a v2 event through seed `H` from the checkpoint and remaining envelopes. Test CCF final archive loading after covered envelopes are pruned and with a checkpoint spanning multiple query pages. Frozen legacy events still load in full. Replay returns the requested range when it is retained and requests a snapshot reload when the range was pruned.
- A client seeds `lastSequence` from its snapshot (`H` read before the envelope query) and does not spuriously replay on its first live envelope.
- An older source revision in a newly sequenced envelope cannot overwrite a newer Dexie record. The cursor still advances after processing.
- A missing sequence causes deterministic fetch of exactly the missing envelopes through the uncached replay route.
- Neither `dynamoMain.js` nor `ccaMain.js` writes to the legacy partition after cutover.
- The stale-client policy chosen under open question 7 is implemented.
- Automated tests cover conditional-put conflicts, retries, duplicate delivery, gaps, replay, and loading both event formats.
- **First-load gap:** a client that opens a v2 event right after a record was written shows that record within a bounded time after the pipeline distributes it (for example 10 seconds), with no manual refresh, whether the envelope was published before or after the subscription. The Playwright flows' `waitForHistory` setup step (in `frontend/e2e/support/fixture.js`) exists only to work around this gap; once it is closed, an e2e that opens the event with no setup wait and asserts the record appears within that bound, run in parallel at least 40 times with no failure, is the check, and the wait can be removed.
- A new subscriber receives the retained head envelope, and a head more than one ahead of `lastSequence` triggers replay.
