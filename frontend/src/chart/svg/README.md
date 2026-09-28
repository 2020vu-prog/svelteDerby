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
- The renderer uses authored image-position data only to infer visual ordering.
  It does not reproduce the PNG's irregular coordinates exactly.

## Layout Requirements

- Render every heat as an enclosing frame with A and B positions inside it.
- Normalize columns so heat and placement frames never overlap, while retaining
  the authored vertical row positions.
- Treat the midpoint between a heat's authored A and B positions as its row
  center. Frame sizing and slot text offsets must not move that center.
- When authored rows are too close, reduce the uniform frame height for that
  column instead of moving the rows.
- All heat frames in a visual column must have identical dimensions.
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
- Heat-position controls are keyboard accessible and open the same
  `ChartPosition` route as the legacy chart.

## Progression Rules

- Render winner advancement between heats only.
- Do not invent race-to-placement lines.
- Do not render loser or runoff lines/arrows.
- In double elimination, a championship reset heat is conditional when a
  destination has an `AWINS?` or `BWINS?` condition. Mark that heat as
  `If Required` and do not draw a normal route into it.

## Visual Constraints

- Heat frames, position text, and winner-advancement lines need distinct
  styling. Apply runtime state colors to a prominent heat-frame border rather
  than participant text; when slot states differ, use the renderer's explicit
  border-color precedence.
- Driver labels must remain legible and should not be obscured by route lines.
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
view-box bounds, authored row centers, normalized positioned grids,
same-column sizing, compact uniform gutters, box overlap, placement bands, and
championship reset heats anchored to their source championship column.
