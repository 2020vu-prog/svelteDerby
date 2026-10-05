# Design proposal: `canDelegateDriverProfile` permission & role

Date: 2026-09-04
Touches: `backend/modules/lambdaDerby/src/shared/RoutePermission.js`, `RoleName.js`, `PermissionLookup.js`, `permissionLits.js`, `ApiRouter.js`, `DriverDelegationService.js`, `frontend/src/routes/routeDefinitions.js`, `frontend/src/DriverAdd.svelte`, `frontend/src/DriverList.svelte`, a new frontend route/component

## What this is, in one paragraph

Today, generating a driver's walkup-delegation QR code (`delegateWalkup()`, `DriverAdd.svelte:56-82`) and revoking a maintainer live entirely inside `DriverAdd.svelte`, whose route requires `RoutePermission.CAN_ADD_PARTICIPANT` (`routeDefinitions.js:150-154`) — the same permission that gates adding/editing drivers, CSV/JSON bulk import-export, and every other field on the driver record. The ask is a narrower role: a new `canDelegateDriverProfile` permission, and a new role that grants **only** that permission, letting a holder look up an arbitrary driver and display/generate their delegation QR — but not reach `driverAdd` at all.

## Why this doesn't fit as an extra gate inside `DriverAdd.svelte`

The precedent for gating a sub-section of a page independently of the route's own permission already exists — `DriverAdd.svelte:33`'s `canManageDriverJson` store wraps just the CSV/JSON block, and `DriverList.svelte:30-32,152` gates just the edit-pencil icon with `CAN_ADD_PARTICIPANT`. But that pattern only helps once a user is already *on* the page. Reaching `driverAdd` at all requires `CAN_ADD_PARTICIPANT` at the route level (`RouteHost.svelte:30-61`, the single enforcement point for route access), so a role holding only the new permission can never load the component to begin with, regardless of what's gated inside it. Nothing in the app today lets a non-maintainer, non-`CAN_ADD_PARTICIPANT` user pick an arbitrary driver by number either — `DriverProfile.svelte`/`DriverProfileList.svelte` are strictly "drivers I already maintain," filtered by hash, not permission. So this needs its own route, not a new `{#if}` inside the existing one.

## New permission

`RoutePermission.js:50` — add immediately after `CAN_ADD_PARTICIPANT`, following the file's existing `SCREAMING_SNAKE` constant / `"CanXxx"` string convention:

```js
CAN_DELEGATE_DRIVER_PROFILE: new RoutePermission("CanDelegateDriverProfile"),
```

`permissionLits.js` — register it via `addPermission(RoutePermission.CAN_DELEGATE_DRIVER_PROFILE, ["/createDriverDelegation", "/revokeDriverMaintainer"])`. This only feeds the secondary `hasServerRoutePath` path-prefix helper (`Permission.js:3-18`), not the primary per-route `ApiRouter` gate below — worth adding for completeness/consistency with how `POWER`'s route list works, not load-bearing.

## New role

`RoleName.js:8-13` — add a new persisted role name (string value is written into `OrgPerm` records and must never change once shipped, per the file's own comment). Proposed: `DRIVER_DELEGATE: "driverDelegate"` — open to a different name (see Open questions).

`PermissionLookup.js:32-39` — add to `permsByRoleMap`:

```js
[RoleName.DRIVER_DELEGATE]: {
    [RoutePermission.CAN_DELEGATE_DRIVER_PROFILE.toString()]: true,
},
```

Nothing else — satisfies "grants just that permission." `getRolePermissions()` (`PermissionLookup.js:61-77`) always injects `ANONYMOUS` on top of whatever a role grants, same as every other role, which is fine — `ANONYMOUS` alone reaches nothing new.

`backend/test/permissionLookup.test.js:8-9` asserts `Object.values(RoleName)` equals `getNamedRoles()`'s key set (`permsByRoleMap`'s keys) — both edits land together or that test fails. Once added, the role is automatically assignable wherever the org-user-role UI reads `getNamedRoles()` — no separate frontend work needed there.

## Backend: gate the two delegation endpoints on either permission

`/createDriverDelegation` and `/revokeDriverMaintainer` (`DriverDelegationService.js:67-68,91-92`) are each registered with a single `permission: RoutePermission.CAN_ADD_PARTICIPANT`. They need to accept the new permission as an alternative, not a replacement — staff with `CAN_ADD_PARTICIPANT` keep working exactly as today.

`ApiRouter.register()`/`dispatch()`/`authorize()` (`ApiRouter.js:72-99,135-197`) currently accept exactly one `RoutePermission` per route and do a single-permission check. This needs a small, backward-compatible extension: let `route.permission` be either a single `RoutePermission` (existing routes, unchanged) or an array, and have `authorize()` pass if the caller holds *any* one of them. This is new router capability but narrow and reusable — no other route needs it yet, but it's the honest shape of "either of these two permissions may call this endpoint," not a special case bolted onto just these two routes.

No handler-level change needed beyond the route registration — `createDelegation`/`revokeMaintainer` (`DriverDelegationService.js:136-173,293-317`) don't currently do any additional per-caller ownership check (staff are treated as an already-vetted population), and that stays true for the new role too, per the spec ("delegate qr for other drivers" implies no per-driver ownership restriction on this role either).

## Frontend: a route this role can actually reach

New route, e.g.:

```js
{
    id: "driverDelegateQr",
    path: "/driverDelegateQr/:number",
    component: "DriverDelegateQr",
    permission: RoutePermission.CAN_DELEGATE_DRIVER_PROFILE,
}
```

registered in `routeDefinitions.js` and the component map in `routeComponents.js`, alongside a new `DriverDelegateQr.svelte` extracted from `DriverAdd.svelte:629-658` — `delegateWalkup()`, `revokeMaintainer()`, `refreshMaintainers()`, the `delegateSpinning`/`delegateQrSvg`/`delegateLink`/`delegateExpiresAt`/`maintainerHashes`/`revokeSpinningHash` state, and the QR display markup including the `.delegateQr` sizing fix from #116 — none of which is entangled with the add/edit form fields, so extraction is mechanical. Unlike `DriverAdd.svelte`, this component starts from a route param (`:number`) rather than a `mode === "Update"` form already holding the driver in memory, so it needs its own small `onMount` to resolve that driver from `$driverMap`/Dexie before rendering the delegate section — the same lookup `DriverAdd.svelte`'s own `refreshDataFromDb()` already does, just without the rest of that function's add/edit-form setup.

**Picking a driver to act on**: `DriverList.svelte` already lists every driver in the event, ungated (route permission `ANONYMOUS`), and already demonstrates gating one row-level affordance independently of the route (`canAddParticipant`/`CAN_ADD_PARTICIPANT` on the edit-pencil icon at `DriverList.svelte:152-162`, deep-linking to `/driverAdd/{item}`). Add a parallel affordance there — `createPermissionStore(RoutePermission.CAN_DELEGATE_DRIVER_PROFILE)`, a second icon/link per row to `/driverDelegateQr/{item}` — so this role has a way to browse to any driver without touching `driverAdd`.

`driverAdd` itself needs no code change: this role is never granted `CAN_ADD_PARTICIPANT`, so `RouteHost.svelte`'s existing route-level check already keeps it out — that's a direct consequence of the permission model, not something to additionally enforce.

`RouteHelp` coverage (per `docs/FrontendRouteHelp.md`'s requirement) needs a new help file for `driverDelegateQr`.

## Summary of file changes

| File | Change |
|---|---|
| `RoutePermission.js` | add `CAN_DELEGATE_DRIVER_PROFILE` |
| `permissionLits.js` | register its route-prefix list (optional, for completeness) |
| `RoleName.js` | add new role constant |
| `PermissionLookup.js` | add role → `{ CAN_DELEGATE_DRIVER_PROFILE: true }` entry to `permsByRoleMap` |
| `ApiRouter.js` | extend `authorize()`/route registration to accept a permission array (OR-check) |
| `DriverDelegationService.js` | change `/createDriverDelegation` and `/revokeDriverMaintainer` to permission `[CAN_ADD_PARTICIPANT, CAN_DELEGATE_DRIVER_PROFILE]` |
| `routeDefinitions.js` + `routeComponents.js` | new `driverDelegateQr/:number` route |
| new `DriverDelegateQr.svelte` | extracted delegate-QR section from `DriverAdd.svelte`, with its own driver lookup |
| `DriverList.svelte` | new gated affordance linking to the new route |
| `docs/FrontendRouteHelp.md`-covered help content | new help file for the route |

## Testing

- A user holding only the new role can reach `/driverDelegateQr/:number` for any driver number, generate a QR, and see the maintainer list, but a direct navigation to `/driverAdd/:number` is denied (`PermissionDenied`).
- The same user cannot call `/addParticipant`, CSV/JSON import-export, or anything else gated on `CAN_ADD_PARTICIPANT`.
- `/createDriverDelegation` and `/revokeDriverMaintainer` still succeed for a caller holding only `CAN_ADD_PARTICIPANT` (existing staff flow unaffected) and now also succeed for a caller holding only `CAN_DELEGATE_DRIVER_PROFILE`; a caller holding neither is rejected.
- `backend/test/permissionLookup.test.js` still passes with the new role added to both `RoleName.js` and `permsByRoleMap`.
- The new role is selectable in the org-user role-assignment UI without any UI code change (sourced from `getNamedRoles()`).

## Open questions to confirm before implementation

- **Role name/label.** Proposed `RoleName.DRIVER_DELEGATE = "driverDelegate"` — confirm or rename before it ships, since the string is persisted and can't change later.
- **Revoke included?** The spec says "display & delegate qr for other drivers." Does this role also get to revoke *other* maintainers (the existing revoke list/button), or is it generate/view only? As scoped above, it includes revoke, since the backend change grants both endpoints to the new permission — trim to display+generate only (leave `/revokeDriverMaintainer` as `CAN_ADD_PARTICIPANT`-only) if that's not intended.
- **`ApiRouter` OR-permission.** Fine to extend `authorize()` to accept multiple permissions (small, reusable, no other route needs it yet), or is there a preference for a narrower way to avoid touching shared router code?
