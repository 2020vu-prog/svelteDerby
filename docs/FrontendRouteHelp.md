# Frontend Route Help

Status: proposed design; not yet implemented.

## Goals

- Provide screen-level help without permanently consuming significant UI space.
- Define help by naming convention instead of adding metadata to every route.
- Make basic help available to every user.
- Show help for privileged features only when the current user has the required permission.
- Implement the help launcher once, rather than modifying every screen component.

## Help file convention

Help is written in Markdown and named after the component declared by the
matched route.

```text
frontend/src/help/RacePhaseList.help.md
frontend/src/help/RacePhaseList.help.MANUAL_FINISH_TIME.md
frontend/src/help/RacePhaseList.help.CAN_INITIATE_ANNOUNCEMENT.md
```

The base file, `ComponentName.help.md`, is public help. It is available without
checking a permission.

An optional permission suffix identifies help for an additional feature:

```text
ComponentName.help.PERMISSION_KEY.md
```

`PERMISSION_KEY` must be a property exported by `RoutePermission`, such as
`MANUAL_FINISH_TIME`. Using the enum-style property name instead of the
serialized permission value makes invalid filenames easy to validate.

One component may have a public file, any number of permission-specific files,
or only permission-specific files. A Markdown heading supplies the displayed
section title, so no separate title configuration is required.

Example public help:

```markdown
# Phase History

This screen displays completed race phases.

Select a race to view its cars, times, and result.
```

Example restricted help:

```markdown
# Manual Timing

Select a phase letter to enter or correct its finish time manually.
```

## Resolution and authorization

`RouteHelp.svelte` receives the current route match from `RouteHost.svelte` and
uses `currentMatch.definition.component` as the help filename prefix. For
example, the `RacePhaseList` component resolves files beginning with
`RacePhaseList.help`.

Webpack `require.context()` discovers matching Markdown files at build time.
The list of filenames can be inspected without loading every document. Help
content should be loaded when the help panel is opened, keeping it out of the
initial application path where practical.

The resolver includes:

1. The component's base public help file, when present.
2. Each permission-specific file for which the current user has the named
   permission in the selected organization.

Permission filtering uses the same reactive email, role, event, and
`RoutePermission` infrastructure as route and component authorization. Logging
out or changing roles must immediately remove restricted help sections.

Help visibility is only a user-interface concern. Backend authorization remains
responsible for protecting privileged operations.

## User interface

`RouteHelp.svelte` is rendered once by `RouteHost.svelte` alongside the routed
screen and contextual `MaterialAdd` action.

- A small `?` button appears only when the current user has at least one help
  section available.
- Position the button at the lower-left so it does not conflict with the
  lower-right `MaterialAdd` button.
- On mobile, tapping the button opens a bottom sheet.
- On wider screens, it opens a compact side panel.
- Public and authorized restricted sections appear together in the panel.
- Tapping outside the panel, tapping its close control, or pressing Escape
  closes it.
- The launcher uses `aria-label="Help for this screen"`, and the opened panel
  manages focus appropriately.

Markdown rendering should disable embedded HTML. Links should use safe URL
schemes and external links should clearly indicate that they leave the
application.

## Validation and tests

Automated tests should verify that:

- Every permission suffix names an existing `RoutePermission` property.
- Public help is available while logged out.
- Restricted help is omitted without its permission.
- Restricted help appears when the permission is granted.
- Restricted help disappears reactively after logout or a role change.
- A route without applicable help does not display the help launcher.
- Routes sharing a component share its help documents.

## Escape hatch

The component-name convention should be the default. If two routes using the
same component eventually require different help, an optional `helpId` route
property may override the component name. Do not add that configuration until a
real route requires it.
