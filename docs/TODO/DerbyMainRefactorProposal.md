# Refactor proposal: `derbyMain.js`

Date: 2026-08-22
File: `backend/modules/lambdaDerby/src/derbyMain.js` (2,205 lines)

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

**1. `shared/eventRequestUtils.js`** — `getOrgId`, `getOrgIz`, `getEventKey`, `getTtl`, `stringIsTrue`, `noopAsync`. Pure functions, no AWS deps, used by nearly everything else. Extract this one first — it has no dependencies of its own, so it's the safest place to prove the extraction pattern before touching anything stateful.

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
