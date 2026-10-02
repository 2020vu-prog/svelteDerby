import assert from "node:assert/strict";
import test from "node:test";

import { buildChartTree, containsChart } from "#src/chartTree.js";

const listing = (...keys) => keys.map((Key) => ({ Key }));

test("nests chart images by folder and drops the S3 prefix", () => {
    const tree = buildChartTree(
        listing(
            "data/brackets/AASBD/Double/08double.png",
            "data/brackets/AASBD/Single/12single.png",
            "data/brackets/NDR/N04double.png"
        )
    );

    assert.deepEqual(tree, [
        {
            id: "AASBD",
            name: "AASBD",
            children: [
                {
                    id: "AASBD/Double",
                    name: "Double",
                    children: [
                        {
                            id: "AASBD/Double/08double.png",
                            name: "08double.png",
                        },
                    ],
                },
                {
                    id: "AASBD/Single",
                    name: "Single",
                    children: [
                        {
                            id: "AASBD/Single/12single.png",
                            name: "12single.png",
                        },
                    ],
                },
            ],
        },
        {
            id: "NDR",
            name: "NDR",
            children: [{ id: "NDR/N04double.png", name: "N04double.png" }],
        },
    ]);
});

test("keeps only chart images", () => {
    const tree = buildChartTree(
        listing(
            "data/brackets/AASBD/Double/08double.png",
            "data/brackets/AASBD/Double/08double.json",
            "data/brackets/AASBD/Double/08double.combined.json",
            "data/brackets/NDR/N04double.pdf",
            "data/brackets/NDR/N04Double.xlsx",
            "data/brackets/README.md",
            "data/brackets/"
        )
    );

    assert.deepEqual(
        tree.map((node) => node.id),
        ["AASBD"]
    );
    assert.equal(tree[0].children[0].children.length, 1);
});

test("lists folders before charts, in natural order", () => {
    const tree = buildChartTree(
        listing(
            "data/brackets/Z.png",
            "data/brackets/AASBD/12double.png",
            "data/brackets/AASBD/6double.png",
            "data/brackets/AASBD/08double.png",
            "data/brackets/AASBD/Single/x.png",
            "data/brackets/A.png"
        )
    );

    assert.deepEqual(
        tree.map((node) => node.name),
        ["AASBD", "A.png", "Z.png"]
    );
    assert.deepEqual(
        tree[0].children.map((node) => node.name),
        ["Single", "6double.png", "08double.png", "12double.png"]
    );
});

test("matches the extension case-insensitively and ignores bad input", () => {
    assert.deepEqual(
        buildChartTree(listing("data/brackets/NDR/N04.PNG")).map((n) => n.id),
        ["NDR"]
    );
    assert.deepEqual(buildChartTree(), []);
    assert.deepEqual(buildChartTree([]), []);
    assert.deepEqual(buildChartTree([null, {}, { Key: null }]), []);
});

test("does not duplicate a folder shared by several charts", () => {
    const tree = buildChartTree(
        listing(
            "data/brackets/NDR/a.png",
            "data/brackets/NDR/b.png",
            "data/brackets/NDR/a.png"
        )
    );

    assert.equal(tree.length, 1);
    assert.deepEqual(
        tree[0].children.map((node) => node.name),
        ["a.png", "b.png"]
    );
});

test("finds which folders contain a chart", () => {
    const [aasbd, ndr] = buildChartTree(
        listing(
            "data/brackets/AASBD/Double/08double.png",
            "data/brackets/NDR/N04double.png"
        )
    );

    assert.equal(containsChart(aasbd, "AASBD/Double/08double.png"), true);
    assert.equal(
        containsChart(aasbd.children[0], "AASBD/Double/08double.png"),
        true
    );
    assert.equal(containsChart(ndr, "AASBD/Double/08double.png"), false);
    assert.equal(containsChart(aasbd, ""), false);
    assert.equal(containsChart(aasbd, undefined), false);
    // A chart (leaf) contains nothing.
    assert.equal(containsChart({ id: "x.png", name: "x.png" }, "x.png"), false);
});
