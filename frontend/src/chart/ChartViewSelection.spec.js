import { beforeEach, expect, it, vi } from "vitest";

let selectionCounter;

vi.mock("#src/eventDb.js", () => ({
    getUserPreference: vi.fn(() => selectionCounter),
}));

import { getSelectedChartView } from "#src/chart/ChartViewSelection.js";

beforeEach(() => {
    selectionCounter = undefined;
});

it("resolves the persisted chart view selection", () => {
    selectionCounter = 0;
    expect(getSelectedChartView(true).path).toBe("/chartDetail");
    selectionCounter = 1;
    expect(getSelectedChartView(true).path).toBe("/chartDetailCardList");
    selectionCounter = 2;
    expect(getSelectedChartView(true).path).toBe("/chartSvgPrototype");
});

it("excludes the SVG view when developer mode is disabled", () => {
    selectionCounter = 2;
    expect(getSelectedChartView(false).path).toBe("/chartDetail");
    selectionCounter = undefined;
    expect(getSelectedChartView(false).path).toBe("/chartDetail");
});
