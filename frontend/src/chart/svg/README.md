# SVG Chart Renderer

## Goal

Provide one reusable SVG renderer for single- and double-elimination charts
without replacing the established PNG chart experience. The SVG view is a
developer-mode prototype and is reached through the existing chart-title view
switcher as the third chart view.

The title switcher uses one persisted, monotonically increasing global
selection counter. Each activation selects `counter % eligibleViews`; callers
do not identify their current view. Enabling developer mode changes the
eligible view count from two to three.

The chart list resolves that same persisted counter when opening a chart, so
leaving a detail page and returning through the list preserves the selected
image, card, or SVG view.

## Runtime Data

- Chart JSON supplies `progress`, `imgPositions`, and `imgSize`.
- The chart CSV defines how bracket positions advance. Generated
  `combined.json` files consolidate the CSV progression and JSON overlay data;
  they are not hand-maintained source data.
- Position labels and state come from `augmentChartState`, the same mechanism
  used by the working chart. Labels should show the current car number and
  driver name when a participant is assigned.
- Slot state must refresh when chart JSON, chart ID, heat ID, slot, or the
  shared refresh store changes; a reused slot component must not retain the
  previous heat's participant.
- The renderer uses authored image-position data only to infer columns and the
  top-to-bottom order of heats within a column. It does not reproduce the PNG's
  coordinates; vertical positions are computed (see Layout Requirements).

## Layout Requirements

- Render every heat as an enclosing frame with A and B positions inside it.
- Heat and placement frames never overlap.
- Vertical layout is compact and recomputed from the visible columns whenever
  column visibility changes. A heat is fed when a winner route arrives from a
  visible heat in the directly neighboring column.
  - Heats with no feeding heat (the first column, the outermost column of the
    other side of a double elimination, and any column whose neighboring feeder
    column is hidden) stack tightly in their authored order with a small gap.
  - A fed heat is vertically centered on the heat or heats that feed it: the
    midpoint of two feeders, or level with a single feeder. If an earlier heat
    in the same column is in the way, it moves down just enough to clear it.
  - A conditional championship heat sits directly below the heat that creates
    it, in the same column.
  - Columns are placed in dependency order, so a column follows every
    neighboring column that feeds it. Routes that skip over a column do not
    count as feeders.
- Every heat frame has the same dimensions; slot text offsets are derived from
  that height.
- Use one compact, uniform horizontal gutter between primary heat columns,
  including sparse transition columns.
- Only primary heat columns determine chart width. Attach each conditional `If
Required` heat to the same column as the championship heat that creates it,
  and place results in a compact band below the bracket so neither creates
  another page-layout column.
- The SVG must use a responsive `viewBox` and remain usable at narrower widths.
- Fit the chart to its container by default and provide chart-local zoom that
  expands it within a scrollable viewport. Preserve that fitted pixel width
  across desktop browser zoom so the chart scales with the page instead of
  immediately shrinking back to the reflowed viewport width.
- Provide slider and increment controls at 100%, 125%, 150%, 175%, 200%, 250%,
  300%, 350%, 400%, 500%, 600%, 700%, and 800%. Activating the displayed
  percentage resets the chart to its 100% fit width.
- Give every column a keyboard-accessible visibility control at its top. A
  hidden column becomes a narrow vertical separator with its show icon centered
  above it. Removing or restoring a column recomputes column positions, routes,
  and view-box bounds; it must not leave an empty column-sized gap.
- Color both show and hide icons with the same aggregate status logic used by
  the card-list round tabs. Summarize both slots of every heat in the column
  using this precedence: `pendingSeed`, `ready`, `phaseOneComplete`, `complete`.
  Hidden-column status must continue to refresh.
- Initially hide columns with no participant car numbers and columns whose
  required heats are all complete. If that hides the entire chart, retain the
  championship column for a completed event or the seed-bearing columns for an
  event that has not begun. User visibility changes take precedence after this
  one-time initialization.
- Heat-position controls are keyboard accessible and open the same
  `ChartPosition` route as the legacy chart.

## Progression Rules

- Render winner advancement between heats only.
- Do not invent race-to-placement lines.
- Do not render loser or runoff lines/arrows.
- In double elimination, a championship reset heat is conditional when a
  destination has an `AWINS?` or `BWINS?` condition. Mark that heat as
  optional (`isOptional`) and do not draw a normal route into it. Its title
  shows only the heat's CSV `Annotation`, not hard-coded "If Required" text.

## Visual Constraints

- Heat frames, position text, and winner-advancement lines need distinct
  styling. Apply runtime state colors to a prominent heat-frame border rather
  than participant text; when slot states differ, use the renderer's explicit
  border-color precedence.
- Driver labels must remain legible and should not be obscured by route lines.
- Keep participant car numbers at the chart's standard font size. Scale only
  the driver-name span to the heat's remaining width so the complete label stays
  inside the frame. Scale non-participant route labels as a whole when needed.
- The renderer must not depend on a chart-family-specific component or a
  chart-specific coordinate override.
- Existing PNG and card chart views remain functional and unchanged.

## Printing

- Chart-local zoom is applied as an inline pixel width and therefore affects
  Chrome's printed output.
- Chrome page zoom is generally separate from printing. Print Preview applies
  its own `Scale` setting after chart-local zoom.
- The effective PDF size is the chart-local zoom multiplied by the Print
  Preview scale.
- For predictable PDFs, reset chart-local zoom to 100% and adjust sizing with
  the Print Preview scale.

## Verification

Run the focused layout suite after changing layout or progression behavior:

```sh
node --test frontend/src/chart/svg/ChartSvgLayout.test.mjs
```

The tests cover reusable graph layout, conditional destinations, responsive
view-box bounds, compact stacking, feeder centering, normalized positioned grids,
same-column sizing, compact uniform gutters, box overlap, placement bands, and
championship reset heats anchored to their source championship column.
