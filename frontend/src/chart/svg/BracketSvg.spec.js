import { cleanup, fireEvent, render, waitFor } from "@testing-library/svelte";
import { afterEach, expect, it, vi } from "vitest";
import { writable } from "svelte/store";

vi.mock("../../stores.js", () => ({
    doRefreshBlocks: writable(0),
}));
vi.mock("../../utils.js", () => ({
    parseHeatPos: vi.fn((position) => [position, position]),
    augmentChartState: vi.fn((_chartJson, _chartId, heatId) =>
        Promise.resolve({
            posHtml: heatId === "Place1" ? " - 42 Ada Lovelace" : "",
            bracketClass: "ready",
            rsFromDexie: {},
        })
    ),
}));

import BracketSvg from "./BracketSvg.svelte";

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
