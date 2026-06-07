# s3ChartData

This directory contains chart assets used by the app at runtime.

Each real chart asset is a pair:

```text
name.png
name.json
```

The PNG is the base chart image. The matching JSON file contains overlay
coordinates for names and labels that are placed over the PNG at runtime.

For example:

```text
AASBD/Double/64double.png
AASBD/Double/64double.json
```

## Directory Layout

```text
AASBD/
  Double/
  Single/
NDR/
```

`AASBD` charts are split into `Double` and `Single` folders. `NDR` charts are
kept directly in the `NDR` folder.

## File Types

- `.png` - base chart image rendered by the app.
- `.json` - source overlay data for the matching PNG.
- `.combined.json` - generated data that consolidates the CSV bracket logic and
  JSON overlay data for a chart; do not treat this as a source chart pair.
- `.csv` - bracket advancement data that controls how racers move through the
  chart.
- `.xlsx` and `.pdf` - present for some `NDR` charts.

## Source Pairing Rule

Ignore `*.combined.json` files when checking source chart assets.

Every source `*.json` file should have a matching same-name `*.png` file, and
every source chart PNG should have a matching same-name `*.json` file.

Useful checks from this directory:

```sh
for f in $(find . -type f -name '*.json' ! -name '*.combined.json' | sort); do
  base=${f%.json}
  [ -f "$base.png" ] || echo "$f -> missing $base.png"
done

for f in $(find . -type f -name '*.png' | sort); do
  base=${f%.png}
  [ -f "$base.json" ] || echo "$f -> missing $base.json"
done
```

No output means the source JSON/PNG pairs are complete.

## Overlay JSON Shape

Overlay files use this structure:

```json
{
  "imgSize": {
    "height": 1700,
    "width": 2200
  },
  "imgPositions": {
    "01A": {
      "left": 22,
      "top": 161
    }
  }
}
```

`imgPositions` keys identify heat slots or placement labels. Each value is the
overlay coordinate for that name/label.

The `imgSize` value is the coordinate system used by the runtime overlay logic.
It does not necessarily match the physical pixel dimensions reported by the PNG
file.

## 64 Double Notes

`AASBD/Double/64double.json` was added manually because the matching source JSON
was missing while `64double.png` already existed.

Important notes for that file:

- It should remain human-readable, with 2-space JSON indentation.
- It contains 266 overlay positions.
- It includes heat slots through `127A` and `127B`, plus `501`, `502`, and
  placement labels.
- Heat `127` is runoff-style, more like heat `501` than heat `126`: both
  entries share the same left position, with `127A` above `127B`.
- Heat `126` has a hand-corrected layout; preserve it unless intentionally
  recalibrating the chart.

## Generated Files

`*.combined.json` files are generated artifacts. They consolidate the matching
CSV bracket-advancement data and JSON overlay-coordinate data for each chart.

They may not have a matching `*.combined.png`, and they should not be used when
determining whether a source chart asset pair is complete.
