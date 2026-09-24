import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
    new URL("./chartSvgLayout.js", import.meta.url),
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

test("uses the chart's authored slot positions when available", () => {
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
    assert.deepEqual(layout.slots["02A"], { x: 400, y: 170 });
    assert.equal(layout.viewBox.width >= 900, true);
    assert.equal(layout.viewBox.height, 500);
});

test("sizes positioned heat frames around horizontally separated slots", () => {
    const layout = buildSvgChartLayout(
        { 14: { WinnerDest: "Place1", LoserDest: "Place2" } },
        {
            "14A": { left: 490, top: 555 },
            "14B": { left: 847, top: 592 },
        }
    );

    assert.equal(layout.heats["14"].width, 527);
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
