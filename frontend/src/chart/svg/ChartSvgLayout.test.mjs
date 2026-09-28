import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
    new URL("./ChartSvgLayout.js", import.meta.url),
    "utf8"
);
const moduleUnderTest = await import(
    `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);

const { buildSvgChartLayout, svgEdgePath } = moduleUnderTest;

test("builds one reusable graph layout from chart progression", () => {
    const layout = buildSvgChartLayout({
        "01": { "#Round": "Round 1", WinnerDest: "02A", LoserDest: "Place2" },
        "02": { "#Round": "Final", WinnerDest: "Place1", LoserDest: "Place3" },
    });

    assert.equal(Object.keys(layout.heats).length, 2);
    assert.equal(layout.heats["02"].x > layout.heats["01"].x, true);
    assert.deepEqual(Object.keys(layout.placements), [
        "Place1",
        "Place2",
        "Place3",
    ]);
    assert.match(svgEdgePath(layout.edges[0], layout), /^M /);
});

test("supports conditional chart destinations without failing the layout", () => {
    const layout = buildSvgChartLayout({
        "01": {
            "#Round": "Round 1",
            WinnerDest: "(02A:03B)AWINS?",
            LoserDest: "OUT",
        },
        "02": { "#Round": "Round 2", WinnerDest: "OUT", LoserDest: "OUT" },
        "03": { "#Round": "Round 2", WinnerDest: "OUT", LoserDest: "OUT" },
    });

    assert.equal(
        layout.edges.filter((edge) => edge.fromHeat === "01").length,
        2
    );
});

test("keeps every placement row inside the SVG viewBox", () => {
    const layout = buildSvgChartLayout({
        "01": { WinnerDest: "Place1", LoserDest: "Place2" },
        "02": { WinnerDest: "Place3", LoserDest: "Place4" },
        "03": { WinnerDest: "Place5", LoserDest: "Place6" },
        "04": { WinnerDest: "Place7", LoserDest: "Place8" },
    });

    const placementBottom = Math.max(
        ...Object.values(layout.placements).map(
            (placement) => placement.y + placement.height
        )
    );

    assert.equal(layout.viewBox.height >= placementBottom, true);
});

test("uses authored positions to arrange a non-overlapping SVG grid", () => {
    const layout = buildSvgChartLayout(
        {
            "01": { WinnerDest: "02A", LoserDest: "Place2" },
            "02": { WinnerDest: "Place1", LoserDest: "Place3" },
        },
        {
            "01A": { left: 40, top: 120 },
            "01B": { left: 40, top: 220 },
            "02A": { left: 400, top: 170 },
            "02B": { left: 400, top: 270 },
            Place1: { left: 700, top: 100 },
            Place2: { left: 700, top: 180 },
            Place3: { left: 700, top: 260 },
        },
        { width: 900, height: 500 }
    );

    assert.equal(layout.positioned, true);
    assert.equal(layout.heats["02"].x > layout.heats["01"].x, true);
    assert.equal(layout.heats["02"].y - layout.heats["01"].y, 50);
    assert.equal(layout.slots["02A"].x, layout.heats["02"].x + 8);
    assert.equal(layout.slots["02A"].y > layout.heats["02"].y, true);
    assert.equal(
        layout.slots["02B"].y <
            layout.heats["02"].y + layout.heats["02"].height,
        true
    );
    assert.equal(layout.viewBox.width < 900, true);
});

test("centers heat frames on the midpoint of their authored slots", () => {
    const layout = buildSvgChartLayout(
        {
            1: { WinnerDest: "2A", LoserDest: "OUT" },
            2: { WinnerDest: "OUT", LoserDest: "OUT" },
        },
        {
            "1A": { left: 20, top: 100 },
            "1B": { left: 20, top: 200 },
            "2A": { left: 20, top: 220 },
            "2B": { left: 20, top: 300 },
        }
    );
    const firstCenter = layout.heats["1"].y + layout.heats["1"].height / 2;
    const secondCenter = layout.heats["2"].y + layout.heats["2"].height / 2;

    assert.equal(secondCenter - firstCenter, 110);
    assert.equal(layout.heats["1"].height, layout.heats["2"].height);
});

test("uses the same box size for all heats in an authored column", () => {
    const layout = buildSvgChartLayout(
        {
            14: { WinnerDest: "Place1", LoserDest: "Place2" },
            15: { WinnerDest: "Place1", LoserDest: "Place2" },
        },
        {
            "14A": { left: 490, top: 555 },
            "14B": { left: 847, top: 592 },
            "15A": { left: 510, top: 700 },
            "15B": { left: 510, top: 730 },
        }
    );

    assert.equal(layout.heats["14"].width, layout.heats["15"].width);
    assert.equal(layout.heats["14"].height, layout.heats["15"].height);
    assert.equal(
        layout.heats["14"].y + layout.heats["14"].height < layout.heats["15"].y,
        true
    );
});

test("spaces primary columns evenly without adding a placement column", () => {
    const layout = buildSvgChartLayout(
        {
            1: { WinnerDest: "2A", LoserDest: "OUT" },
            2: { WinnerDest: "3A", LoserDest: "OUT" },
            3: { WinnerDest: "Place1", LoserDest: "Place2" },
        },
        {
            "1A": { left: 20, top: 100 },
            "1B": { left: 20, top: 160 },
            "2A": { left: 220, top: 100 },
            "2B": { left: 220, top: 160 },
            "3A": { left: 520, top: 100 },
            "3B": { left: 520, top: 160 },
            Place1: { left: 900, top: 100 },
            Place2: { left: 900, top: 180 },
        }
    );
    const columns = [layout.heats["1"], layout.heats["2"], layout.heats["3"]];
    const gaps = columns.slice(1).map((column, index) => {
        const previous = columns[index];
        return column.x - (previous.x + previous.width);
    });

    assert.deepEqual(gaps, [12, 12]);
    assert.equal(layout.placements.Place1.x, layout.heats["1"].x);
    assert.equal(layout.placements.Place2.x, layout.heats["2"].x);
    assert.equal(
        layout.viewBox.width,
        layout.heats["3"].x + layout.heats["3"].width + 36
    );
});

test("does not overlap positioned heat or placement boxes", () => {
    const layout = buildSvgChartLayout(
        {
            1: { WinnerDest: "2A", LoserDest: "Place2" },
            2: { WinnerDest: "Place1", LoserDest: "Place3" },
            3: { WinnerDest: "Place4", LoserDest: "Place5" },
        },
        {
            "1A": { left: 20, top: 10 },
            "1B": { left: 20, top: 20 },
            "2A": { left: 50, top: 30 },
            "2B": { left: 50, top: 40 },
            "3A": { left: 350, top: 10 },
            "3B": { left: 350, top: 20 },
            Place1: { left: 500, top: 10 },
            Place2: { left: 500, top: 20 },
            Place3: { left: 500, top: 30 },
            Place4: { left: 500, top: 40 },
            Place5: { left: 500, top: 50 },
        }
    );
    const boxes = [
        ...Object.values(layout.heats),
        ...Object.values(layout.placements),
    ];

    for (let index = 0; index < boxes.length; index++) {
        for (
            let otherIndex = index + 1;
            otherIndex < boxes.length;
            otherIndex++
        ) {
            const box = boxes[index];
            const other = boxes[otherIndex];
            const overlaps =
                box.x < other.x + other.width &&
                other.x < box.x + box.width &&
                box.y < other.y + other.height &&
                other.y < box.y + box.height;

            assert.equal(overlaps, false);
        }
    }
});

test("renders championship reset heats as optional without normal routes", () => {
    const layout = buildSvgChartLayout({
        14: {
            WinnerDest: "(AWINS?Place1:15B)",
            LoserDest: "(AWINS?Place2:15A)",
        },
        15: { WinnerDest: "Place1", LoserDest: "Place2" },
    });

    assert.equal(layout.heats["15"].isOptional, true);
    assert.equal(
        layout.edges.some((edge) => edge.fromHeat === "14"),
        false
    );
});

test("does not add a column for a positioned championship reset heat", () => {
    const layout = buildSvgChartLayout(
        {
            13: { WinnerDest: "OUT", LoserDest: "OUT" },
            14: {
                WinnerDest: "(AWINS?Place1:15B)",
                LoserDest: "(AWINS?Place2:15A)",
            },
            15: { WinnerDest: "Place1", LoserDest: "Place2" },
        },
        {
            "13A": { left: 500, top: 100 },
            "13B": { left: 500, top: 180 },
            "14A": { left: 100, top: 100 },
            "14B": { left: 100, top: 180 },
            "15A": { left: 510, top: 300 },
            "15B": { left: 510, top: 380 },
            Place1: { left: 900, top: 100 },
            Place2: { left: 900, top: 180 },
        }
    );

    assert.equal(layout.heats["15"].x, layout.heats["14"].x);
    assert.equal(layout.placements.Place1.x, layout.heats["14"].x);
    assert.equal(layout.viewBox.width, 424);
});
