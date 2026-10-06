import { render, fireEvent, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import { writable } from "svelte/store";

vi.mock("#src/stores.js", () => ({
    doRefreshBlocks: writable(0),
    driverMap: writable({}),
}));
vi.mock("#src/eventDb.js", () => ({ db: {} }));
vi.mock("svelte-spa-router", () => ({
    push: vi.fn(),
    pop: vi.fn(),
    replace: vi.fn(),
}));
vi.mock("#src/utils.js", () => ({
    parseHeatPos: vi.fn((pos) => [pos.slice(0, -1), pos.slice(-1)]),
    augmentChartState: vi.fn(async () => ({
        bracketClass: "ready",
        posHtml: "",
    })),
}));

import ChartHotSpot from "#src/ChartHotSpot.svelte";
import { push } from "svelte-spa-router";

afterEach(cleanup);

const props = {
    left: 10,
    top: 20,
    scale: 1,
    pos: "03A",
    chartId: "chart-1",
    chartJson: {},
};

describe("ChartHotSpot", () => {
    it("calls onHotMove with the new position when a drag ends", async () => {
        const onHotMove = vi.fn();
        const view = render(ChartHotSpot, {
            ...props,
            isPannable: true,
            onHotMove,
        });
        const spot = view.container.querySelector("#myDIV");

        await fireEvent.mouseDown(spot, { clientX: 100, clientY: 100 });
        await fireEvent.mouseMove(window, { clientX: 105, clientY: 107 });
        expect(onHotMove).not.toHaveBeenCalled();
        await fireEvent.mouseUp(window, { clientX: 105, clientY: 107 });

        expect(onHotMove).toHaveBeenCalledTimes(1);
        expect(onHotMove).toHaveBeenCalledWith({ top: 27, left: 15 });
    });

    it("adds up several moves within one drag", async () => {
        const onHotMove = vi.fn();
        const view = render(ChartHotSpot, {
            ...props,
            isPannable: true,
            onHotMove,
        });
        const spot = view.container.querySelector("#myDIV");

        await fireEvent.mouseDown(spot, { clientX: 0, clientY: 0 });
        await fireEvent.mouseMove(window, { clientX: 3, clientY: 4 });
        await fireEvent.mouseMove(window, { clientX: 10, clientY: 6 });
        await fireEvent.mouseUp(window, { clientX: 10, clientY: 6 });

        expect(onHotMove).toHaveBeenCalledWith({ top: 26, left: 20 });
    });

    it("opens the chart position instead when it is not pannable", async () => {
        const onHotMove = vi.fn();
        const view = render(ChartHotSpot, {
            ...props,
            isPannable: false,
            onHotMove,
        });

        await fireEvent.click(view.container.querySelector("#\\30 3A"));

        expect(push).toHaveBeenCalled();
        expect(onHotMove).not.toHaveBeenCalled();
    });
});
