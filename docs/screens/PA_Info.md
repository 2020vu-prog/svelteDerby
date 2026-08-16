# Screen Requirements: PA Info

## Purpose
Summarize driver name, car number, race status, notes, and driver sponsor for the cars on the block.
Do the same for the most recently completed race at the bottom of the screen

## Route and Access

- Route: `/#/pa_info`
- Route parameters: none
- Required permission: CanAnnounce
- Menu location: on main menu after charts
- Visibility rules: users with the `Announcer` role

## Related Screens

- Similar screen or component: amalgamation of race, history and driver info
- Behavior to reuse: dynamic update
- Behavior that should differ: layout

## Data

### Inputs

- Route parameters: [list]
- Svelte stores: `nextOnBlockKey`, `racePhaseMap`, `driverMap`, `standingsMap`
- IndexedDB tables: none; participant details come from `driverMap`

### API Requests
- none

### Data Changes

Display only. Change data on the fly when new data appears in `stores.js`.

## Behavior

- Derive the Next on Blocks race from `racePhaseMap[nextOnBlockKey]`.
- Display the Next on Blocks status using the same status semantics and presentation as `RacePhase.svelte`.
- Derive the most recently completed race from the `standingsMap` entry where `hasResults()` is true and `at` is greatest.
- Display completed-race status using the same status semantics and presentation as `RaceStanding.svelte`.
- Update the displayed race and participant details reactively when the relevant stores change.
- Display `pName` when present with the label `Pronunciation:`.
- Do not render race or driver data for users without `CanAnnounce`.
- When the starting blocks are empty, display `Starting blocks are empty.`
- When there are no standings with results, display `No completed races.`
- Omit missing lane or participant fields instead of displaying placeholder text.

## Layout

Describe the screen from top to bottom:

1. Header: default from App.svelte + screen name
2. Layout is grid based.  All components of the grid are similar.  Top row is next on blocks
   Second row is the most recently finished race. Left column is lane one driver. Right column is lane two.

## Responsive and Accessibility Requirements

- Desktop layout: as noted above
- Mobile layout: stack the four driver cards in display order: next-on-blocks
  lane 1, next-on-blocks lane 2, completed-race lane 1, completed-race lane 2.

## Open Questions

- None
## References
