# Refactor proposal: `derbyMain.js`

Date: 2026-08-22
File: `backend/modules/lambdaDerby/src/derbyMain.js` (2,205 lines)

## Progress

- **Step 1, `eventRequestUtils.js`: done** (2026-10-03). `getOrgId`, `getOrgIz`, `getEventKey`, `getTtl`, `stringIsTrue`, and `noopAsync` moved verbatim out of `derbyMain.js`, which now imports them. They are covered by `backend/test/eventRequestUtils.test.js`, which pins their current behavior, quirks included. Verified by a differential run of the original functions against the extracted ones (87 identical results, including inputs that throw), a source comparison, a mutation check, `npm pack` including the new file, and `derbyMain.js` still loading.
- **Step 2, `IotService.js`: done** (2026-10-03). `attachPrincipalPolicy`, `requestIotVideoUploadRaw`, `requestIotVideoUploadByRP`, `getLowestPhrMillis`, `iotDefaultPri`, `iotOverridePri`, and `iotDiscover` moved into a class constructed with `(iotClient, ddbUtils, createIotDataClient)`, and the four call sites in `derbyMain.js` now go through `iotService`. The module-level `let iotdata` became the instance field `this.iotdata`, still created lazily on the first publish. The control-plane `IoTClient` is still built in `derbyMain.js` and injected. The data-plane client is built through an injectable factory (defaulting to `new IoTDataPlaneClient({ endpoint })`) so tests do not need a real client; the endpoint is still read from `process.env.IotEndpoint` at first use. `derbyMain.js` is about 2,094 lines. `backend/test/iotService.test.js` adds the first unit coverage for these functions. Verified by a differential run of the original functions against the class on 46 scenarios (results, thrown errors, AWS calls, constructed endpoints, and log lines identical), plus mutation checks of the harness and the tests.
- **Step 3, `S3MediaService.js`: done** (2026-10-03). `s3QueryChartTypes`, `s3QueryMediaPrefix`, and the presigned-URL generation from the `/requestS3PutObjectUrl` handler (as `requestS3PutObjectUrl(orgId, qsp)`) moved into a class constructed with the `S3Client`. The three route handlers in `derbyMain.js` call it and keep their own request handling and `buildResponse`/cache-control, so `S3MediaService` returns data, not responses. `derbyMain.js` no longer imports `ListObjectsV2Command`, `PutObjectCommand`, `getSignedUrl`, or `getAllKeys`; it keeps `S3Client` and `CopyObjectCommand` for the S3-event handler. `derbyMain.js` is about 2,039 lines. `backend/test/s3MediaService.test.js` adds the first unit coverage (its put-URL tests use the real SDK to presign offline with fake credentials). Verified by a differential run of the original route handlers and helpers against the new routes and service on 21 scenarios (responses and cache headers, thrown errors, S3 and presign calls, and log lines identical), plus mutation checks of the harness and the tests.
  - Left as found, per the "what this doesn't try to fix" rule: in the `/requestS3PutObjectUrl` handler, `qsp` is a `const` that is reassigned (`qsp = {}`) when the query string is missing, which throws a `TypeError` instead of returning the "missing key" error. The differential run pins that this behavior is unchanged. It is a good small follow-up fix once the extractions are done.
- **Step 4, `RaceProgressionService.js`: done** (2026-10-03). The 18 race-progression and bracket methods moved into a class taking `ddbUtils`, `ddbClient`, `s3Client`, `newAnnounceResults`, `logUtils`, `iotService`, and `requestContext` (plus an optional `createTmpCache` factory for tests). `derbyMain.js` constructs it after `S3MediaService` and calls `raceProgressionService.addPending2`, `addBlocks`, `deleteRacePhase`, `getPhaseElapsed`, `addChartMetaData`, `addOrUpdateChartPosition`, and `applyFinishTime`. It no longer imports `TmpCache`, `stringIsTrue`, or `noopAsync`. `derbyMain.js` is about 1,502 lines. `backend/test/raceProgressionService.test.js` adds unit coverage with real `EntityFactory` entities. Verified by a differential run of the original block against the new class on 187 scenarios (results, thrown errors, every ddb/cache/announce/iot/log call and its arguments, and input mutations identical), 100% statement and branch coverage of the new module, and 18 of 18 injected mutations caught. **One intentional difference:** `getSourceName()` is derived from the call stack, so the `source` persisted by `logPendingFromChartPosError` changes from `derbyMain.js:logPendingFromChartPosError` to `RaceProgressionService.js:logPendingFromChartPosError`; nothing reads it, and a test pins the file part. **Not run:** the integration suite (`npm run test:integration`), because it needs `backend/test/.env.local` and AWS credentials. Run it before relying on this in the test environment. No logic was fixed during the move; known oddities were left as they were.
- **Step 5, `TimerConfigService.js`: done** (2026-10-03). The ten timer methods moved into a class taking `ddbUtils`; `derbyMain.js` calls `timerConfigService.getSanitizedTimers`, `getActivePbTimers`, `addTimerConfig` (also from `addEventConfig`), `addTimerPbConfig`, `queryTimerHistoryByOrgId`, and `queryTimerPbHistory`. `derbyMain.js` no longer imports `crypto` or `js-base64`. `backend/test/timerConfigService.test.js` adds unit coverage. Verified by a differential run of the original block against the class on 42 scenarios (results, errors, every ddb call and its arguments, and input mutations identical, with the clock frozen); 6 of 7 injected mutations were caught, and the survivor only changes a log line in dead code. Left as they were: `addTimerPbConfig` builds a `pbDelete` record it never writes, and `addTimerConfig` declares an unused shadowing `prevTC`. The integration suite was not run (no `backend/test/.env.local`).
- Steps 6 to 10: not started.

Notes from step 1 that apply to the rest:
- The proposal first named `shared/eventRequestUtils.js`, but `shared/` holds the modules the frontend imports (`EntityFactory`, the permission modules). Backend-only helpers belong in the `src` root, so the module lives at `src/eventRequestUtils.js`; the remaining new modules are in the root as listed.
- Line numbers and counts below are from 2026-08-22. The file is about 2,200 lines now and the clusters have drifted, so locate functions by name.
- `npm run test:unit` in `backend/test` is an explicit list of test files, so a new test file must be added to that script.
- `backend/test` pins Node 22 and npm 10 (`engine-strict`); install and run it with that toolchain.
- The backend Jest suite (`npm run test:unit` in `backend/test`) now also runs on pull requests, in `format.yml` (added 2026-10-03), so each extraction PR is checked by it before merge; it still runs in `deploy.yml` after a merge. The deployed integration suite is not run in CI (it needs AWS credentials).

## The good news first

This is a lower-risk refactor than the line count suggests, for two reasons visible in the code itself.

First, the routing/auth framework is already properly separated. `ApiRouter.js` is a clean, dependency-injected class — `apiRouter.test.js` mocks `authenticate`/`authorize`/`loadContext`/`buildResponse` and never touches `derbyMain.js` directly. `derbyMain.js`'s job at the framework level is just to *wire* those functions and register routes; it doesn't own the routing logic. Nothing here needs to change.

Second, the extraction pattern this proposal recommends is already half-applied in the same file. `AnnounceResults`, `ApiRaceStanding`, `DiscordUtils`, `ArchiveUtils`, and `LogUtils` are all separate files, instantiated once at module scope and constructor-injected with `ddbUtils` (see lines 56–83). What's left inside `derbyMain.js` is everything that *hasn't* gotten that treatment yet: roughly 90 functions covering race progression, timer config, event config, org users, IoT, and SNS ingestion, all still living as closures directly in the file. This proposal is "finish the pattern the file already started," not "impose a new one."

Also worth knowing before touching anything: no test in `backend/test/` requires internal `derbyMain.js` functions by name — they all go through `exports.handler` or a mocked `ApiRouter`. That means extraction is free to move and rename internal functions as long as `routeMap` and `lambdaHandler`'s external behavior stay identical; you're not going to break a test by renaming `addPending2`.

## What's actually in the file

Reading top to bottom, the 2,205 lines break into these clusters:

| Lines (approx) | Cluster | Representative functions |
|---|---|---|
| 1–85 | Bootstrap / composition root | AWS client construction, `jwtVerifier`, service singletons |
| 87–124, 272–316 | S3 + IoT primitives | `s3QueryChartTypes`, `attachPrincipalPolicy`, `requestIotVideoUploadRaw` |
| 142–670 | **Race progression / bracket charts** | `applyFinishTime`, `advanceChartPos`, `addBlocks`, `cloneRs`, `applyPtcpToChartPos` |
| 669–747 | Chart metadata & position | `addChartMetaData`, `getCachedBmd`, `addOrUpdateChartPosition` |
| 761–995 | Timer config & history | `addTimerConfig`, `addTimerPbConfig`, `getActiveTimers`, `registerEventWithTimer` |
| 749–760, 996–1073 | Event/org config | `addEventConfig`, `updateEventConfig`, `addOrgConfig` |
| 1075–1083, 1084–1110 | Participant + request parsing | `addParticipant2`, `getOrgId`, `getOrgIz`, `getEventKey` |
| 1111–1191 | IoT discover + org roles | `iotDiscover`, `getOrgRoles` |
| 1192–1586 | `routeMap` | declarative path → permission/handler table |
| 1588–1627 | Response building | `buildResponse`, `getDerbyMainVersionInfo` |
| 1629–1740 | Router wiring | `registerPublicRoutes`, `authenticateApiRequest`, `createApiRouter` |
| 1742–1963 | **SNS finish-time ingestion** | `snsApplyPbTimerHandler`, `snsApplyTimerHandler`, `getApplyableNextOnBlocks` |
| 1967–2081 | Org user / roles | `listOrgUser`, `addOrgUser`, `getUserRoles` |
| 2082–2206 | Lambda event dispatch | `lambdaHandler`, `exports.handler` |

The two largest, most tangled clusters — race progression (~530 lines) and SNS ingestion (~220 lines) — are also functionally coupled: the SNS handlers exist to turn a physical timer's finish-time message into a call to `applyFinishTime`, which lives in the race-progression cluster. That relationship should stay explicit (one depends on the other via constructor injection), not get flattened into one file.

## Proposed module split

Each new file follows the existing convention: a class, constructor-injected with the already-built singletons (`ddbUtils`, `s3Client`, etc.) rather than constructing its own clients. `derbyMain.js` becomes the composition root that builds all of them once, the same way it already does for `AnnounceResults`.

**1. `eventRequestUtils.js`** — `getOrgId`, `getOrgIz`, `getEventKey`, `getTtl`, `stringIsTrue`, `noopAsync`. Pure functions, no AWS deps, used by nearly everything else. Extract this one first — it has no dependencies of its own, so it's the safest place to prove the extraction pattern before touching anything stateful.

**2. `IotService.js`** — `attachPrincipalPolicy`, `requestIotVideoUploadRaw`, `requestIotVideoUploadByRP`, `getLowestPhrMillis`, `iotDefaultPri`, `iotOverridePri`, `iotDiscover`. Note: the lazily-initialized `let iotdata = ""` module-level variable (line 272) needs to become an instance field on this class, not stay as a bare module-scope `let` — right now it's the kind of shared mutable state that gets confusing once it's not the only thing in the file.

**3. `S3MediaService.js`** — `s3QueryChartTypes`, `s3QueryMediaPrefix`, the `requestS3PutObjectUrl` handler body (presigned URL generation). Small, self-contained, currently scattered between top-of-file helpers and inline route handlers.

**4. `RaceProgressionService.js`** — the big one. `addPending2`, `applyFinishTime`, `advanceChartPos`, `loadRaceStandingFromBracketPos`, `logPendingFromChartPosError`, `loadBracketPosFromRaceStanding`, `addPendingFromChartPos`, `getChartDestination`, `applyPtcpToChartPos`, `isRaceStandingAdhoc`, `cloneRs`, `getPhaseElapsed`, `isPendingNeeded`, `deleteRacePhase`, `addBlocks`, `addChartMetaData`, `getCachedBmd`, `addOrUpdateChartPosition`. Constructor deps: `ddbUtils`, `s3Client`/`ddbClient` (for `TmpCache`), an `AnnounceResults` factory, `logUtils`, `IotService` (for the finish-time video-upload side effect currently called via `requestIotVideoUploadByRP`), and `requestContext`. This is ~600 lines moving out of `derbyMain.js` in one extraction — by far the biggest single win, and also the domain most worth having isolated for future unit testing, since it's the core race-scoring logic.

**5. `TimerConfigService.js`** — `getSanitizedTimers`, `queryTimerPbHistory`, `queryTimerHistoryByOrgId`, `getActiveTimers`, `getActivePbTimers`, `registeredTimerSha`, `doNotPublishUuid`, `addTimerPbConfig`, `addTimerConfig`, `registerEventWithTimer`. Deps: `ddbUtils`.

**6. `EventConfigService.js`** — `addOrgConfig`, `addEventConfig`, `updateEventConfig`, `addNewEventPushSns`, `addParticipant2`. Deps: `ddbUtils`, `snsClient`, `logUtils`, `requestContext`.

**7. `OrgUserService.js`** — `listOrgUser`, `addOrgUser`, `refreshUserDisplayNamesFromOrgPerm`, `getUserRoles`, `getUserRolesForOrgIz`, `getOrgRoles`. Deps: `ddbUtils`, `requestContext`.

**8. `SnsFinishTimeIngestion.js`** — `snsApplyPbLogMessage`, `snsApplyPbTimerHandler`, `snsApplyTimerHandler`, `getApplyableNextOnBlocks`, `dbFmtTimer`, `validNumericTime`. Deps: `RaceProgressionService` (for `applyFinishTime`), an `AnnounceResults` factory, `ddbUtils`.

**9. `lambdaEventDispatch.js`** — the raw-event routing currently inside `lambdaHandler`: detecting API Gateway v1 vs. v2 shape, EventBridge cron events, SNS records, S3 records, plus `lowercaseHeaders`. This is a distinct responsibility from the HTTP API router — it's the outermost Lambda trigger adapter, and separating it makes `derbyMain.js`'s remaining code read as "one thing" (composition + HTTP routes) instead of two.

**10. `response.js`** — `buildResponse`, `getDerbyMainVersionInfo`. Deps: `ssmClient`.

### What stays in `derbyMain.js`

After the above, `derbyMain.js` becomes the composition root and HTTP route table: AWS client construction, service instantiation (now delegating to the classes above instead of bare functions), the `routeMap` (which shrinks to referencing `service.method` instead of locally-defined functions), `registerPublicRoutes`/`registerCoreRoutes`, `authenticateApiRequest`/`loadApiRequestContext`/`authorizeApiRequest`/`createApiRouter`, and `exports.handler`. That's roughly 300–400 lines — appropriately sized for "this is the file that wires everything together and declares the routes," which is a legitimate single responsibility, unlike what's there today.

## Migration approach

Given this is a live production Lambda with no per-PR CI gate yet (flagged separately in the audit), the highest-leverage sequencing is:

1. Extract `eventRequestUtils.js` first, as a proof of the pattern — zero AWS dependencies, easy to verify by inspection, low blast radius if something's subtly wrong.
2. Extract in dependency order after that: `IotService` and `S3MediaService` next (no dependencies on the other new services), then `RaceProgressionService` (depends on `IotService`), then `SnsFinishTimeIngestion` (depends on `RaceProgressionService`), then the remaining independent services, then `lambdaEventDispatch.js` last.
3. One extraction per PR, not a single big-bang change. Each PR should be reviewable as "moved these N functions verbatim into a class, updated call sites in `derbyMain.js`" — resist the urge to also fix logic bugs (like the dead `403` branch in `getOrgRoles`, or the `TODO` comments scattered through this code) in the same PR; do those as separate, clearly-labeled follow-ups so a behavior regression is easy to bisect to.
4. Run `npm run test:unit` in `backend/test/` after each extraction — it already exercises `apiRouter`, `permissionLookup`, `auth`, and (per its name) core `derbyMain` behavior indirectly through the handler. Run the integration suite (`npm run test:integration`, needs local AWS credentials per the README) before merging any extraction that touches `RaceProgressionService` or `SnsFinishTimeIngestion` specifically — those are the two domains with real state-machine complexity (chart advancement, tie handling, bracket position propagation) where a subtle behavior change is most likely and least likely to be caught by the existing unit tests alone.
5. This is a natural moment to also wire the PR-validation CI workflow that's already on your `TODO.md` backlog — running the unit suite automatically on each of these extraction PRs is exactly the safety net this refactor benefits most from, and you'd otherwise be relying on remembering to run tests manually before every merge.

## What this doesn't try to fix

This proposal is purely structural — moving code, not changing behavior. It deliberately doesn't address the commented-out `timer_protobuf` require, the dead `403` return in `getOrgRoles`, or the `TODO` comments embedded in the business logic (e.g. the tie-handling caveat around line 231, `cloneRs` messing with announcements). Once the domains are split into separate files, those become much smaller, more isolated diffs to review and fix — but doing it as part of the extraction would make the extraction PRs harder to verify as behavior-preserving, which is the property that makes this refactor safe to do incrementally on a live system.
