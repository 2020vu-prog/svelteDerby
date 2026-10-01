import { cleanup, fireEvent, render, waitFor } from "@testing-library/svelte";
import { afterEach, expect, it, vi } from "vitest";
import { writable } from "svelte/store";

vi.mock("../../stores.js", () => ({
    doRefreshBlocks: writable(0),
}));
vi.mock("../../utils.js", () => ({
    parseHeatPos: vi.fn((position) => [position, position]),
    augmentChartState: vi.fn(() =>
        Promise.resolve({ posHtml: "", bracketClass: "ready", rsFromDexie: {} })
    ),
}));

import BracketSvg from "./BracketSvg.svelte";

afterEach(cleanup);

const chartJson = {
    progress: {
        1: { WinnerDest: "3A", LoserDest: "4A" },
        2: { WinnerDest: "3B", LoserDest: "4B" },
        3: {
            WinnerDest: "Place1",
            LoserDest: "Place2",
            Annotation: "Championship",
        },
        4: {
            WinnerDest: "Place3",
            LoserDest: "Place4",
            Annotation: "Runoff 3/4",
        },
    },
};

const heatTransform = (view, text) => {
    const [, x, y] = view
        .getByText(text)
        .closest(".heat")
        .getAttribute("transform")
        .match(/translate\(([-\d.]+) ([-\d.]+)\)/);
    return { x: Number(x), y: Number(y) };
};

it("shows runoff heats in their own section, outside the column controls", async () => {
    const view = render(BracketSvg, { chartId: "c", chartJson });
    const hide = view.getByRole("button", { name: "Hide Column 1" });
    await waitFor(() => expect(hide).toHaveClass("ready"));

    // Two main columns (not three): the runoff heat has no column of its own.
    expect(view.container.querySelectorAll(".column-control")).toHaveLength(2);
    const runoff = heatTransform(view, "Heat 4 (Runoff 3/4)");
    const placement = view.container
        .querySelector(".placement")
        .getAttribute("transform");
    const [, placementX, placementY] = placement.match(
        /translate\(([-\d.]+) ([-\d.]+)\)/
    );
    expect(runoff.x).toBeGreaterThan(Number(placementX));
    expect(runoff.y).toBeGreaterThanOrEqual(Number(placementY) - 1);
    expect(heatTransform(view, "Heat 3 (Championship)").y).toBeLessThan(
        runoff.y
    );

    // Hiding every main column leaves the runoff section visible, still level
    // with the top of the placements.
    await fireEvent.click(hide);
    await fireEvent.click(view.getByRole("button", { name: "Hide Column 2" }));
    expect(view.queryByText("Heat 1")).not.toBeInTheDocument();
    expect(view.getByText("Heat 4 (Runoff 3/4)")).toBeInTheDocument();
    const after = heatTransform(view, "Heat 4 (Runoff 3/4)");
    const placementAfter = view.container
        .querySelector(".placement")
        .getAttribute("transform")
        .match(/translate\(([-\d.]+) ([-\d.]+)\)/);
    expect(after.x).toBe(runoff.x);
    expect(after.y).toBe(Number(placementAfter[2]));
});

it("ends hidden-column guide lines above the runoff section", async () => {
    const view = render(BracketSvg, { chartId: "c", chartJson });
    await waitFor(() =>
        expect(view.getByRole("button", { name: "Hide Column 1" })).toHaveClass(
            "ready"
        )
    );
    await fireEvent.click(view.getByRole("button", { name: "Hide Column 1" }));

    const guide = view.container.querySelector(".hidden-column-placeholder");
    const runoff = heatTransform(view, "Heat 4 (Runoff 3/4)");
    expect(Number(guide.getAttribute("y2"))).toBeLessThan(runoff.y);
});
