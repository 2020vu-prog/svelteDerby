# SVG Chart Renderer

## Goal

Provide one reusable SVG renderer for single- and double-elimination charts
without replacing the established PNG chart experience. The SVG view is a
developer-mode prototype and is reached through the existing chart-title view
switcher as the third chart view.

## Runtime Data

- Chart JSON supplies `progress`, `imgPositions`, and `imgSize`.
- The chart CSV defines how bracket positions advance. Generated
  `combined.json` files consolidate the CSV progression and JSON overlay data;
  they are not hand-maintained source data.
- Position labels and state come from `augmentChartState`, the same mechanism
  used by the working chart. Labels should show the current car number and
  driver name when a participant is assigned.
- The renderer uses authored image-position data only to infer visual ordering.
  It does not reproduce the PNG's irregular coordinates exactly.

## Layout Requirements

- Render every heat as an enclosing frame with A and B positions inside it.
- Normalize columns so heat and placement frames never overlap, while retaining
  the authored vertical row positions.
- When authored rows are too close, reduce the uniform frame height for that
  column instead of moving the rows.
- All heat frames in a visual column must have identical dimensions.
- The SVG must use a responsive `viewBox` and remain usable at narrower widths.
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
  styling.
- Driver labels must remain legible and should not be obscured by route lines.
- The renderer must not depend on a chart-family-specific component or a
  chart-specific coordinate override.
- Existing PNG and card chart views remain functional and unchanged.

## Verification

Run the focused layout suite after changing layout or progression behavior:

```sh
node --test frontend/src/chart/svg/chartSvgLayout.test.mjs
```

The tests cover reusable graph layout, conditional destinations, responsive
view-box bounds, normalized positioned grids, same-column sizing, box overlap,
and optional championship reset heats.
