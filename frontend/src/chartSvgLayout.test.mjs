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
