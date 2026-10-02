import { cleanup, fireEvent, render, waitFor } from "@testing-library/svelte";
import { afterEach, expect, it, vi } from "vitest";
import { writable } from "svelte/store";

vi.mock("#src/stores.js", () => ({
    doRefreshBlocks: writable(0),
}));
vi.mock("#src/utils.js", () => ({
    parseHeatPos: vi.fn((position) => [position, position]),
    augmentChartState: vi.fn((_chartJson, _chartId, heatId, slot) =>
        Promise.resolve({
            posHtml: ` - ${heatId === "1" ? 42 : 7} Driver`,
            bracketClass: "ready",
            rsFromDexie: {},
            standing: { heatId },
            ptcp: slot === "A" ? "42" : "7",
        })
    ),
    // Car 42 won heat 1 overall and phase A; car 7 won phase B.
    getHeatResultParts: vi.fn((standing, car) => {
        if (standing?.heatId !== "1") return [];
        return car === "42"
            ? ["Overall: 5100 ms", "A: 2500 ms"]
            : ["B: 1000 ms"];
    }),
}));
vi.mock("#src/chart/svg/printSvg.js", () => ({ printSvgElement: vi.fn() }));

import BracketSvg from "#src/chart/svg/BracketSvg.svelte";
import { getHeatResultParts } from "#src/utils.js";

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

const chartJson = {
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

const results = (view) =>
    [...view.container.querySelectorAll(".heat-result")].map(
        (text) => text.textContent
    );
const frameHeight = (view, text) =>
    Number(
        view
            .getByText(text)
            .closest(".heat")
            .querySelector("rect")
            .getAttribute("height")
    );

async function openMenu(view) {
    await fireEvent.click(view.getByRole("button", { name: "Chart settings" }));
}
const resultsItem = (view) =>
    view.getByRole("menuitemcheckbox", { name: /Show heat results/ });

it("hides heat results by default", async () => {
    const view = render(BracketSvg, { chartId: "c", chartJson });
    await waitFor(() => expect(view.getByText("Heat 1")).toBeInTheDocument());

    expect(results(view)).toEqual([]);
    expect(getHeatResultParts).not.toHaveBeenCalled();
    await openMenu(view);
    expect(resultsItem(view)).toHaveAttribute("aria-checked", "false");
});

it("shows each car's results under its slot and makes room for them", async () => {
    const view = render(BracketSvg, { chartId: "c", chartJson });
    await waitFor(() => expect(view.getByText("Heat 1")).toBeInTheDocument());
    const shortHeight = frameHeight(view, "Heat 1");

    await openMenu(view);
    await fireEvent.click(resultsItem(view));

    await waitFor(() =>
        expect(results(view)).toEqual([
            "Overall: 5100 ms   A: 2500 ms",
            "B: 1000 ms",
        ])
    );
    expect(frameHeight(view, "Heat 1")).toBeGreaterThan(shortHeight);

    // Each result row sits under its slot, inside the frame.
    const [first, second] = view.container.querySelectorAll(".heat-result");
    const heat = view.getByText("Heat 1").closest(".heat");
    const slotA = heat.querySelectorAll("text.slot")[0];
    const slotB = heat.querySelectorAll("text.slot")[1];
    expect(Number(first.getAttribute("y"))).toBeGreaterThan(
        Number(slotA.getAttribute("y"))
    );
    expect(Number(first.getAttribute("y"))).toBeLessThan(
        Number(slotB.getAttribute("y"))
    );
    expect(Number(second.getAttribute("y"))).toBeLessThan(
        frameHeight(view, "Heat 1")
    );

    // Turning it off restores the compact frames.
    await openMenu(view);
    expect(resultsItem(view)).toHaveAttribute("aria-checked", "true");
    await fireEvent.click(resultsItem(view));
    expect(results(view)).toEqual([]);
    expect(frameHeight(view, "Heat 1")).toBe(shortHeight);
});

it("turns heat results on when printing", async () => {
    const { printSvgElement } = await import("#src/chart/svg/printSvg.js");
    const view = render(BracketSvg, { chartId: "c", chartJson });
    await waitFor(() => expect(view.getByText("Heat 1")).toBeInTheDocument());

    await openMenu(view);
    await fireEvent.click(view.getByRole("menuitem", { name: "Print" }));

    await waitFor(() => expect(printSvgElement).toHaveBeenCalledTimes(1));
    const svg = printSvgElement.mock.calls[0][0];
    expect(
        [...svg.querySelectorAll(".heat-result")].map(
            (text) => text.textContent
        )
    ).toEqual(["Overall: 5100 ms   A: 2500 ms", "B: 1000 ms"]);

    await openMenu(view);
    expect(resultsItem(view)).toHaveAttribute("aria-checked", "true");
});
