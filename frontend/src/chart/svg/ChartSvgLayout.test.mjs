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
    assert.deepEqual(layout.slots["02A"], {
        x: layout.heats["02"].x + 8,
        y: layout.heats["02"].y + 24,
    });
    assert.equal(layout.viewBox.width < 900, true);
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
