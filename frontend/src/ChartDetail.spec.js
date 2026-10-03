import { render, fireEvent, waitFor, cleanup } from "@testing-library/svelte";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { get, writable } from "svelte/store";

vi.mock("#src/stores.js", () => ({
    chartClickLoggerId: writable(""),
    chartClickLoggerShow: writable(false),
    getChartCacheKey: vi.fn(() => "cacheKey"),
    spinnerPanelBusy: writable(false),
    doRefreshBlocks: writable(0),
    driverMap: writable({}),
    theme: writable("blue"),
    nowDate: writable(new Date()),
}));
vi.mock("#src/eventDb.js", () => ({
    db: {
        BracketMetaData: {
            get: vi.fn(() =>
                Promise.resolve({
                    bracketName: "Test Chart",
                    imgPath: "NDR/N04double.png",
                })
            ),
        },
    },
}));
vi.mock("#src/utils.js", () => ({
    parseHeatPos: vi.fn((position) => [
        position.replace(/[A-Z]$/i, ""),
        position.slice(-1),
    ]),
    sleep: vi.fn(() => Promise.resolve()),
    getChartJson: vi.fn(() =>
        Promise.resolve({
            imgSize: { height: 1700, width: 2200 },
            imgPositions: {},
            seeds: [],
            progress: {},
        })
    ),
    augmentChartState: vi.fn(() => Promise.resolve({})),
}));
vi.mock("#src/chart/ChartHeaderViewToggle.svelte", async () => ({
    default: (await import("#src/testing/EmptyComponent.svelte")).default,
}));
vi.mock("#src/ChartHotSpot.svelte", async () => ({
    default: (await import("#src/testing/HotSpotStub.svelte")).default,
}));
vi.mock("#src/ChartClickLogger.svelte", async () => ({
    default: (await import("#src/testing/EmptyComponent.svelte")).default,
}));
vi.mock("svelte-spa-router", () => ({
    push: vi.fn(),
    pop: vi.fn(),
    replace: vi.fn(),
}));
vi.mock("axios", () => ({ default: {} }));

import ChartDetail from "#src/ChartDetail.svelte";
import { chartClickLoggerId, chartClickLoggerShow } from "#src/stores.js";

beforeEach(() => {
    chartClickLoggerId.set("");
    chartClickLoggerShow.set(false);
});
afterEach(cleanup);

async function renderChart() {
    const view = render(ChartDetail, { params: { chartId: "chart-1" } });
    const image = await view.findByAltText("bracketImage");
    return { view, image };
}

// jsdom does not lay elements out, so give the image a position to subtract.
function placeImage(image, left, top) {
    Object.defineProperty(image, "offsetLeft", { value: left });
    Object.defineProperty(image, "offsetTop", { value: top });
}

it("never loads jQuery, even while editing the chart", async () => {
    chartClickLoggerShow.set(true);
    await renderChart();

    expect(document.querySelector("script[src*='jquery']")).toBeNull();
    expect(window.jQuery).toBeUndefined();
});

it("records a click on the chart as the selected heat slot, then moves to the next", async () => {
    chartClickLoggerShow.set(true);
    chartClickLoggerId.set("01A");
    const { view, image } = await renderChart();
    placeImage(image, 20, 50);

    await fireEvent.click(image, { clientX: 220, clientY: 380 });

    // The slot was logged and the logger advanced from 01A to 01B.
    expect(get(chartClickLoggerId)).toBe("01B");
    // The position is the click relative to the image (220 - 20 left; 380 - 50
    // top, less the header allowance).
    const spot = await waitFor(() => {
        const element = view.container.querySelector("[data-pos='01A']");
        expect(element).not.toBeNull();
        return element;
    });
    expect(spot.dataset.left).toBe("200");
    expect(spot.dataset.top).toBe("200");
});

it("records each click once, however many times the image has loaded", async () => {
    chartClickLoggerShow.set(true);
    chartClickLoggerId.set("01A");
    const { image } = await renderChart();
    placeImage(image, 0, 0);

    await fireEvent.load(image);
    await fireEvent.load(image);
    await fireEvent.click(image, { clientX: 100, clientY: 300 });
    expect(get(chartClickLoggerId)).toBe("01B");

    await fireEvent.click(image, { clientX: 100, clientY: 400 });
    expect(get(chartClickLoggerId)).toBe("02A");
});

it("ignores clicks unless the click logger is showing and a slot is selected", async () => {
    const { image } = await renderChart();
    placeImage(image, 0, 0);

    // Logger hidden, no slot selected.
    await fireEvent.click(image, { clientX: 100, clientY: 300 });
    expect(get(chartClickLoggerId)).toBe("");

    // A slot is selected but the logger is not showing.
    chartClickLoggerId.set("01A");
    await fireEvent.click(image, { clientX: 100, clientY: 300 });
    expect(get(chartClickLoggerId)).toBe("01A");

    // Showing, but no slot selected.
    chartClickLoggerShow.set(true);
    chartClickLoggerId.set("");
    await fireEvent.click(image, { clientX: 100, clientY: 300 });
    expect(get(chartClickLoggerId)).toBe("");
});
