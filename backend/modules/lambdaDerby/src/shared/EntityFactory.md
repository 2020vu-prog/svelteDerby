# EntityFactory Override Context

`EntityFactory` accepts `propOverrides` that are copied into every entity before
the concrete entity type is selected. The overrides are request or workflow
context, not user payload. They keep entity builders small while still applying
common DynamoDB fields such as `orgId`, `orgIz`, `by`, `byH`, and `TTL`.

## Common Overrides

- `orgId`: event-scoped DynamoDB partition prefix.
- `orgIz`: org index used by org-scoped records such as `OrgConfig` and
  `OrgPerm`.
- `by`: actor stored on created/updated records.
- `byEmail`: actor email used only to derive `byH`; it is intentionally not
  copied onto entity JSON.
- `TTL`: default event expiration applied to event-scoped records.

## Call Sites That Override EntityFactory

### `apiGatewayHandler`

Creates the default request factory from the authenticated request:

- `orgId` comes from the route body/query/event.
- `by` comes from the Cognito username, falling back to email.
- `byEmail` comes from the decoded JWT email and is used to populate `byH`.
- `TTL` comes from the active event config.

This is the normal factory for most event-scoped writes.

### `addOrgConfig`

Temporarily replaces the request factory with one scoped to the org being
created or updated:

- forces `PK = "OrgConfig"` and `SK = json.orgIz`
- preserves `by`
- preserves `byEmail` so `byH` can still be derived
- sets `orgIz` to the org being written

This is needed because `OrgConfig` is org-scoped, not event-scoped.

### `addEventConfig`

Replaces the request factory after the event TTL has been calculated:

- sets `orgId` to the new event id
- preserves `by`
- preserves `byEmail`
- sets `TTL` to the new event TTL

This makes subsequent new-event writes use the new event context instead of any
prior request context.

### `addOrgUser`

Uses a temporary factory for the `OrgPerm` write:

- sets `orgIz` to the org permission scope
- preserves `by`
- intentionally does not use event `orgId`/`TTL` for the OrgPerm write

After the OrgPerm is written, `refreshUserDisplayNamesFromOrgPerm` creates
event-scoped `UserDisplayName` records for the active `orgId`.

### Timer SNS Handlers

Timer update paths rebuild the factory from timer-provided context before
writing derived race records:

- `snsApplyPbFinishBlock`
- `applyTimerHandler`

These paths use timer payload fields such as `orgId`, `by`, and `TTL` because
they do not originate from the normal API Gateway request setup.

### Archive Processing

`ArchiveUtils.processExpiringEventConfig` uses `new EntityFactory({})` while
updating archived event configs. It works from already-loaded entities and does
not have a current user/request context.

### Read/Unmarshal Helpers

`DdbUtils` creates `new EntityFactory({})` for read paths such as exact key
queries and query result unmarshalling. Read paths should reconstruct stored
records without injecting request context.

### Announcement Formatting

`AnnounceResults` creates `new EntityFactory({})` while formatting records that
already exist. It should not add write context.

## Notes For Refactoring

A future copy helper can reduce repeated manual preservation of context:

```js
copyWith(propOverrides = {}) {
    return new EntityFactory({
        ...this.propOverrides,
        ...propOverrides,
    });
}
```

Use that carefully. Some temporary factories intentionally do not inherit every
field. For example, the `addOrgUser` OrgPerm factory should not accidentally
inherit event `orgId` or `TTL` unless that behavior is explicitly desired.

Current class-key expectations are covered by `backend/test/entityFactory.test.js`.
