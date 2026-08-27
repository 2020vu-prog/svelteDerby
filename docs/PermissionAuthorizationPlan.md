# Permission authorization contract

## Goal

Keep Svelte route, menu, help, and action visibility aligned with backend API
authorization, while leaving the backend as the security boundary.

## Current foundation

`backend/modules/lambdaDerby/src/shared/RoutePermission.js` owns the stable
permission names. Frontend route definitions consume that module through
`frontend/src/routes/routePermission.js`, so frontend code does not invent
permission-name strings.

Backend API routing and role policy are still represented separately by
`ApiRouter.js` and `permissionLits.js`. The frontend currently imports backend
role-resolution code to decide visibility. Those separate uses can drift even
when the permission names themselves match.

## Target design

```text
RoutePermission definitions
        |------------------> ApiRouter and backend enforcement
        |------------------> Svelte route and action requirements

Authenticated backend request
        |
        v
  effective permissions for user + organization
        |
        v
  /getMyPermissions response
        |
        v
  Svelte permission store -> routes, menus, help, MaterialAdd
```

The browser uses permissions calculated by the backend. It never becomes an
authorization authority: every protected API route remains enforced by
`ApiRouter`.

## API contract

Add an authenticated `GET /getMyPermissions` endpoint. For the current
principal and selected organization it returns the effective, stable
permission names, for example:

```json
{
  "orgIz": "Test.317f2",
  "permissions": ["CanAddParticipant", "CanTimerConfig"]
}
```

Do not return policy implementation details, role inheritance, or permissions
for another organization. The endpoint must use the same backend context and
role-resolution path as protected API routes.

## Frontend behavior

Create one permission store that is refreshed after login and whenever the
active organization changes. Clear it immediately on logout or when no
organization is selected.

RouteHost, menu definitions, contextual help, and MaterialAdd should consume
that store. Replace direct frontend imports of `PermissionLookup` as each
consumer migrates. `RoutePermission` remains a shared, pure identifier set.

The UI may hide unavailable features, but it must treat an API `403` as the
authoritative result and refresh or invalidate its permission store when
appropriate.

## Contract tests

Add CI tests that enforce all of the following:

1. Every Svelte route permission resolves to a member of `RoutePermission`.
2. Every non-public Svelte route permission is grantable by backend policy.
3. Every API path listed in `permissionLits` is registered by `ApiRouter` with
   the same permission.
4. Every protected `ApiRouter` route is represented by backend policy; public
   and authenticated-without-role routes are explicit exceptions.
5. `/getMyPermissions` returns the same effective permissions as the backend
   route authorization logic for representative roles and organizations.

The tests should use exported route/policy manifests rather than parsing source
files. This keeps additions declarative and makes failures point to the missing
or conflicting definition.

## Delivery order

1. Export backend API and permission-policy manifests; add the contract tests.
2. Add `/getMyPermissions` with backend tests.
3. Add and test the Svelte permission store.
4. Migrate routes, menus, help, and MaterialAdd to the store.
5. Remove frontend use of backend `PermissionLookup`.

This can be delivered in separate PRs. Do not loosen backend authorization
during the migration.
