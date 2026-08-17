# Screen Requirements: TimerColumns

## Purpose

- Displays recent time data by race lane.
- Can be used to manually determine the winner of a race. Applying the winner is handled manually outside this screen.

## Route and Access

- Route: `/#/timerColumns`
- Route parameters: none 

- Required permission: `CanTimerConfig`
- Menu location: Admin
- Visibility rules: when the admin user  is logged in
## Related Screens

- Similar screen or component: https://test.rr1.us/#/timerPbAlignment
- Behavior to reuse: [data sourcing]
- Behavior that should differ: support multiple timers

## User Workflow

1. How the user reaches the screen:  menu selection
2. What the user sees or does first: map timer&timerLane to virtual lane (config s/b persisted locally)
3. Primary interaction: read only; the screen does not apply or persist the winner
4. Expected result: times, differentials, andd placements appear as they become available for the virtual lanes


## Data
Add additional workflows for materially different user roles or outcomes.
- from mqtt protobuf and API (historical)--see https://test.rr1.us/#/timerPbAlignment 

### Inputs

- Route parameters: none
- Svelte stores: new vlane mapping
- Component properties: none
- IndexedDB tables: none

### API Requests


### Data Changes

recalc & re-render asnew timing data arrives via mqtt 
## Layout

Describe the screen from top to bottom:
1. Header: default from App.svelte + screen name
2. Primary controls: timer/timerlane selection for minimum 2 vlanes, max 4 vlanes (persisted loccally in stores). Timer selection is similar to video capture linked timer (https://test.rr1.us/#/captureVideo). Include a duration configuration similar to https://test.rr1.us/#/timerPbAlignment. The duration defaults to 20 minutes.
3. Main content: between two and four columns, depending on configuration above. Each column is Virtual lane (vlane), numbered from one through four, left to right. The maximum duration of a race is 10 seconds. The first `BLOCKED` event received more than 10 seconds after the previous event across all configured virtual lanes starts a new race. When a new race is started, annotate.svelte should be used to label the new race across all columns. The data point of concern is the first (oldest) GPS time that lane is blocked. The first-place winner is the vlane with the oldest timestamp, signifying the nose of that car crossed the finish line first. Label the vlanes first place, 2nd place, 3rd place, etc. Include the time by which each lane lost to the winner.
4. Only load and display data whose timestamp is within the configured duration measured backward from the current time. Remove live data from the display when it ages beyond that duration.

## Components

- Existing components to reuse: [list]
- New components expected: [list]
- Components that must not be changed: [list]
