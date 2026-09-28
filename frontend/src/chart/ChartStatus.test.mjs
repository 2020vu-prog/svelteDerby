import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
    new URL("./ChartStatus.js", import.meta.url),
    "utf8"
);
const { getBracketSummaryClass, getInitialHiddenColumnIds } = await import(
    `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);

test("uses the card-list status precedence for a bracket summary", () => {
    assert.equal(
        getBracketSummaryClass({ complete: true, ready: true }),
        "ready"
    );
    assert.equal(
        getBracketSummaryClass({
            complete: true,
            phaseOneComplete: true,
            pendingSeed: true,
        }),
        "pendingSeed"
    );
    assert.equal(getBracketSummaryClass({ complete: true }), "complete");
    assert.equal(getBracketSummaryClass({}), undefined);
});

const layout = {
    columns: [{ id: "column-1" }, { id: "column-2" }],
    heats: {
        1: { id: "1", columnId: "column-1", isOptional: false },
        2: { id: "2", columnId: "column-2", isOptional: false },
    },
};

function states(bracketClass, options = {}) {
    return ["A", "B"].map(() => ({ bracketClass, ...options }));
}

test("initially hides columns without cars and completed columns", () => {
    assert.deepEqual(
        getInitialHiddenColumnIds(layout, {
            1: states("ready", { rsFromDexie: {} }),
            2: states("complete", { rsFromDexie: {} }),
        }),
        ["column-2"]
    );
});

test("treats a bye heat as complete with or without another car", () => {
    assert.deepEqual(
        getInitialHiddenColumnIds(layout, {
            1: [{ bracketClass: "" }, { bracketClass: "haveBye" }],
            2: states("ready", { rsFromDexie: {} }),
        }),
        ["column-1"]
    );
});

test("treats a forfeit heat as complete", () => {
    assert.deepEqual(
        getInitialHiddenColumnIds(layout, {
            1: [{ bracketClass: "havePtcp" }, { bracketClass: "haveForfeit" }],
            2: states("ready", { rsFromDexie: {} }),
        }),
        ["column-1"]
    );
});

test("shows seed columns when an unstarted chart would otherwise be hidden", () => {
    assert.deepEqual(
        getInitialHiddenColumnIds(layout, {
            1: states("pendingSeed", { isSeed: true }),
            2: states("", { isSeed: false }),
        }),
        ["column-2"]
    );
});

test("shows the championship column when a completed chart would be hidden", () => {
    assert.deepEqual(
        getInitialHiddenColumnIds(layout, {
            1: states("complete", { rsFromDexie: {} }),
            2: states("complete", { rsFromDexie: {} }),
        }),
        ["column-1"]
    );
});
