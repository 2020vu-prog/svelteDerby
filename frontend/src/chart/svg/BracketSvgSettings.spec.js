import { cleanup, fireEvent, render, waitFor } from "@testing-library/svelte";
import { afterEach, expect, it, vi } from "vitest";
import { writable } from "svelte/store";

vi.mock("../../stores.js", () => ({
    doRefreshBlocks: writable(0),
}));
vi.mock("../../utils.js", () => ({
    parseHeatPos: vi.fn((position) => [position, position]),
    augmentChartState: vi.fn((_chartJson, _chartId, heatId, slot) =>
        Promise.resolve({
            posHtml:
                heatId === "1" && slot === "A" ? " - 42 Ada Lovelace" : "",
            bracketClass: "ready",
            rsFromDexie: {},
        })
    ),
}));
vi.mock("./printSvg.js", () => ({ printSvgElement: vi.fn() }));

import BracketSvg from "./BracketSvg.svelte";
import { printSvgElement } from "./printSvg.js";

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

async function openMenu(view) {
    await fireEvent.click(view.getByRole("button", { name: "Chart settings" }));
    return view.getByRole("menu", { name: "Chart settings" });
}

it("opens the settings menu from the gear and closes it on Escape or outside click", async () => {
    const view = render(BracketSvg, { chartId: "c", chartJson });

    expect(view.queryByRole("menu")).not.toBeInTheDocument();
    await openMenu(view);
    expect(
        view.getAllByRole("menuitem").concat(view.getAllByRole("menuitemcheckbox"))
            .map((item) => item.textContent.replace("✓", "").trim())
    ).toEqual(["Show all", "Print", "Show header info", "Short driver names"]);

    await fireEvent.keyDown(window, { key: "Escape" });
    expect(view.queryByRole("menu")).not.toBeInTheDocument();

    await openMenu(view);
    await fireEvent.click(document.body);
    expect(view.queryByRole("menu")).not.toBeInTheDocument();
});

it("shows all hidden columns", async () => {
    const view = render(BracketSvg, { chartId: "c", chartJson });
    const hide = view.getByRole("button", { name: "Hide Column 1" });
    await waitFor(() => expect(hide).toHaveClass("ready"));

    await openMenu(view);
    expect(view.getByRole("menuitem", { name: "Show all" })).toBeDisabled();
    await fireEvent.keyDown(window, { key: "Escape" });

    await fireEvent.click(hide);
    expect(view.getByRole("button", { name: "Show Column 1" })).toBeTruthy();

    await openMenu(view);
    await fireEvent.click(view.getByRole("menuitem", { name: "Show all" }));

    expect(view.queryByRole("menu")).not.toBeInTheDocument();
    expect(view.getByRole("button", { name: "Hide Column 1" })).toBeTruthy();
    expect(view.queryByRole("button", { name: /^Show Column/ })).toBeNull();
});

it("toggles driver names with the short driver names option", async () => {
    const view = render(BracketSvg, { chartId: "c", chartJson });
    await waitFor(() =>
        expect(view.getByText("Ada Lovelace")).toBeInTheDocument()
    );

    await openMenu(view);
    await fireEvent.click(
        view.getByRole("menuitemcheckbox", { name: /Short driver names/ })
    );
    expect(view.queryByText("Ada Lovelace")).not.toBeInTheDocument();
    expect(view.getByText("42")).toBeInTheDocument();

    await openMenu(view);
    const item = view.getByRole("menuitemcheckbox", {
        name: /Short driver names/,
    });
    expect(item).toHaveAttribute("aria-checked", "true");
    await fireEvent.click(item);
    expect(view.getByText("Ada Lovelace")).toBeInTheDocument();
});

it("shows the org logo above the chart with the header info option", async () => {
    const view = render(BracketSvg, {
        chartId: "c",
        chartJson,
        imgPath: "NDR/N04double.png",
    });
    const svg = view.getByRole("group", { name: "SVG bracket prototype" });
    const heightBefore = Number(svg.getAttribute("viewBox").split(" ")[3]);
    expect(view.container.querySelector(".header-logo")).toBeNull();

    await openMenu(view);
    await fireEvent.click(
        view.getByRole("menuitemcheckbox", { name: /Show header info/ })
    );

    const logo = view.container.querySelector(".header-logo");
    expect(logo.getAttribute("href")).toBe("/chart-logo-ndr.png");
    expect(Number(svg.getAttribute("viewBox").split(" ")[3])).toBe(
        heightBefore + 96
    );
});

it("uses the AASBD logo for AASBD charts and disables the option without a logo", async () => {
    const aasbd = render(BracketSvg, {
        chartId: "c",
        chartJson,
        imgPath: "AASBD/Double/08double.png",
    });
    await openMenu(aasbd);
    await fireEvent.click(
        aasbd.getByRole("menuitemcheckbox", { name: /Show header info/ })
    );
    expect(
        aasbd.container.querySelector(".header-logo").getAttribute("href")
    ).toBe("/chart-logo-aasbd.png");
    cleanup();

    const unknown = render(BracketSvg, { chartId: "c", chartJson });
    await openMenu(unknown);
    expect(
        unknown.getByRole("menuitemcheckbox", { name: /Show header info/ })
    ).toBeDisabled();
});

it("prints the chart SVG", async () => {
    const view = render(BracketSvg, { chartId: "c", chartJson });

    await openMenu(view);
    await fireEvent.click(view.getByRole("menuitem", { name: "Print" }));

    expect(printSvgElement).toHaveBeenCalledTimes(1);
    expect(printSvgElement.mock.calls[0][0]).toBe(
        view.getByRole("group", { name: "SVG bracket prototype" })
    );
    expect(view.queryByRole("menu")).not.toBeInTheDocument();
});
