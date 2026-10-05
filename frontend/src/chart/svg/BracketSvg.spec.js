import { cleanup, fireEvent, render, waitFor } from "@testing-library/svelte";
import { afterEach, expect, it, vi } from "vitest";
import { writable } from "svelte/store";

vi.mock("#src/stores.js", () => ({
    doRefreshBlocks: writable(0),
}));
vi.mock("#src/utils.js", () => ({
    parseHeatPos: vi.fn((position) => [position, position]),
    augmentChartState: vi.fn((_chartJson, _chartId, heatId) =>
        Promise.resolve({
            posHtml: heatId === "Place1" ? " - 42 Ada Lovelace" : "",
            bracketClass: "ready",
            rsFromDexie: {},
        })
    ),
}));

import BracketSvg from "#src/chart/svg/BracketSvg.svelte";

afterEach(cleanup);

it("hides, compacts, and restores a chart column", async () => {
    const view = render(BracketSvg, {
        chartId: "chart-1",
        chartJson: {
            progress: {
                1: { WinnerDest: "2A", LoserDest: "OUT" },
                2: { WinnerDest: "Place1", LoserDest: "OUT" },
            },
            imgPositions: {
                "1A": { left: 20, top: 100 },
                "1B": { left: 20, top: 160 },
                "2A": { left: 220, top: 100 },
                "2B": { left: 220, top: 160 },
                Place1: { left: 420, top: 100 },
            },
        },
    });
    const svg = view.getByRole("group", { name: "SVG bracket prototype" });
    const fullWidth = Number(svg.getAttribute("viewBox").split(" ")[2]);
    const hideColumn = view.getByRole("button", { name: "Hide Column 1" });

    await waitFor(() => expect(hideColumn).toHaveClass("ready"));

    await fireEvent.click(hideColumn);

    expect(view.queryByText("Heat 1")).not.toBeInTheDocument();
    expect(view.getByText("Heat 2")).toBeInTheDocument();
    expect(
        view.container.querySelectorAll(".hidden-column-placeholder")
    ).toHaveLength(1);
    expect(
        Number(
            view.container
                .querySelector(".hidden-column-placeholder")
                .getAttribute("y2")
        )
    ).toBeLessThan(
        Number(
            view.container
                .querySelector(".placement")
                .getAttribute("transform")
                .match(/translate\([^ ]+ ([^)]+)\)/)[1]
        )
    );
    expect(view.getByRole("button", { name: "Show Column 1" })).toHaveClass(
        "ready"
    );
    expect(Number(svg.getAttribute("viewBox").split(" ")[2])).toBeLessThan(
        fullWidth
    );

    await fireEvent.click(view.getByRole("button", { name: "Show Column 1" }));

    expect(view.getByText("Heat 1")).toBeInTheDocument();
    expect(
        view.container.querySelectorAll(".hidden-column-placeholder")
    ).toHaveLength(0);
    expect(Number(svg.getAttribute("viewBox").split(" ")[2])).toBe(fullWidth);
});

it("populates placement slots from chart state", async () => {
    const view = render(BracketSvg, {
        chartId: "chart-1",
        chartJson: {
            progress: {
                1: { WinnerDest: "Place1", LoserDest: "OUT" },
            },
            imgPositions: {
                "1A": { left: 20, top: 100 },
                "1B": { left: 20, top: 160 },
                Place1: { left: 220, top: 100 },
            },
        },
    });

    await waitFor(() =>
        expect(view.getByText("Place 1 - 42 Ada Lovelace")).toBeInTheDocument()
    );
});

it("appends a heat's annotation in parentheses after the heat number", () => {
    const view = render(BracketSvg, {
        chartId: "chart-1",
        chartJson: {
            progress: {
                1: { WinnerDest: "2A", LoserDest: "OUT", Annotation: "" },
                2: {
                    WinnerDest: "Place1",
                    LoserDest: "OUT",
                    Annotation: "Championship",
                },
            },
            imgPositions: {
                "1A": { left: 20, top: 100 },
                "1B": { left: 20, top: 160 },
                "2A": { left: 220, top: 100 },
                "2B": { left: 220, top: 160 },
                Place1: { left: 420, top: 100 },
            },
        },
    });

    expect(view.getByText("Heat 1")).toBeInTheDocument();
    expect(view.getByText("Heat 2 (Championship)")).toBeInTheDocument();
});

it("shrinks long heat titles to fit the heat frame", () => {
    const view = render(BracketSvg, {
        chartId: "chart-1",
        chartJson: {
            progress: {
                127: {
                    WinnerDest: "Place1",
                    LoserDest: "OUT",
                    Annotation: "Runoff 5/6/7/8",
                },
            },
            imgPositions: {
                "127A": { left: 20, top: 100 },
                "127B": { left: 20, top: 160 },
                Place1: { left: 420, top: 100 },
            },
        },
    });

    const title = view.getByText("Heat 127 (Runoff 5/6/7/8)");
    const fontSize = parseFloat(title.style.fontSize);
    const frameWidth = Number(
        view.container.querySelector(".heat rect").getAttribute("width")
    );
    expect(fontSize).toBeLessThan(14);
    expect(title.textContent.length * fontSize * 0.62).toBeLessThanOrEqual(
        frameWidth - 16 + 0.001
    );
});

const slotChart = {
    progress: {
        1: { WinnerDest: "2A", LoserDest: "OUT" },
        2: { WinnerDest: "Place1", LoserDest: "OUT" },
    },
    imgPositions: {
        "1A": { left: 20, top: 100 },
        "1B": { left: 20, top: 160 },
        "2A": { left: 220, top: 100 },
        "2B": { left: 220, top: 160 },
        Place1: { left: 420, top: 100 },
    },
};

it("calls onSlotClick with the heat and slot that was chosen, by click or keyboard", async () => {
    const onSlotClick = vi.fn();
    const view = render(BracketSvg, {
        chartId: "chart-1",
        chartJson: slotChart,
        onSlotClick,
    });
    const targets = view.container.querySelectorAll(".slot-target");

    await fireEvent.click(targets[0]);
    expect(onSlotClick).toHaveBeenLastCalledWith({ heatId: "1", slot: "A" });

    await fireEvent.keyDown(targets[1], { key: "Enter" });
    expect(onSlotClick).toHaveBeenLastCalledWith({ heatId: "1", slot: "B" });
    expect(onSlotClick).toHaveBeenCalledTimes(2);
});

it("calls onSlotClick with the placement when a placement is chosen", async () => {
    const onSlotClick = vi.fn();
    const view = render(BracketSvg, {
        chartId: "chart-1",
        chartJson: slotChart,
        onSlotClick,
    });

    await fireEvent.click(view.container.querySelector(".placement"));

    expect(onSlotClick).toHaveBeenCalledTimes(1);
    expect(onSlotClick).toHaveBeenCalledWith({
        heatId: "Place1",
        slot: "Place1",
        clickedOn: "Place1",
    });
});
