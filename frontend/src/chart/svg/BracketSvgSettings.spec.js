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
            posHtml: heatId === "1" && slot === "A" ? " - 42 Ada Lovelace" : "",
            bracketClass: "ready",
            // No cars in heat 2's column, so it is hidden in the default view.
            rsFromDexie: heatId === "2" ? undefined : {},
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
    const menu = await openMenu(view);
    expect(
        [...menu.querySelectorAll("[role^=menuitem]")].map((item) =>
            item.textContent.replace("✓", "").trim()
        )
    ).toEqual(["Show all", "Print", "Show header info", "Show driver names"]);

    await fireEvent.keyDown(window, { key: "Escape" });
    expect(view.queryByRole("menu")).not.toBeInTheDocument();

    await openMenu(view);
    await fireEvent.click(document.body);
    expect(view.queryByRole("menu")).not.toBeInTheDocument();
});

function showAllItem(view) {
    return view.getByRole("menuitemcheckbox", { name: /Show all/ });
}

it("toggles show all and returns to the default view when turned off", async () => {
    const view = render(BracketSvg, { chartId: "c", chartJson });
    await waitFor(() =>
        expect(
            view.getByRole("button", { name: "Show Column 2" })
        ).toBeInTheDocument()
    );
    expect(view.getByRole("button", { name: "Hide Column 1" })).toBeTruthy();

    await openMenu(view);
    expect(showAllItem(view)).toHaveAttribute("aria-checked", "false");
    await fireEvent.click(showAllItem(view));

    expect(view.queryByRole("menu")).not.toBeInTheDocument();
    expect(view.getByRole("button", { name: "Hide Column 2" })).toBeTruthy();
    expect(view.queryByRole("button", { name: /^Show Column/ })).toBeNull();

    await openMenu(view);
    expect(showAllItem(view)).toHaveAttribute("aria-checked", "true");
    await fireEvent.click(showAllItem(view));

    expect(view.getByRole("button", { name: "Show Column 2" })).toBeTruthy();
    expect(view.getByRole("button", { name: "Hide Column 1" })).toBeTruthy();
});

it("discards manual column changes when show all is turned off", async () => {
    const view = render(BracketSvg, { chartId: "c", chartJson });
    await waitFor(() =>
        expect(
            view.getByRole("button", { name: "Show Column 2" })
        ).toBeInTheDocument()
    );

    await fireEvent.click(view.getByRole("button", { name: "Hide Column 1" }));
    expect(view.getByRole("button", { name: "Show Column 1" })).toBeTruthy();

    await openMenu(view);
    await fireEvent.click(showAllItem(view));
    await openMenu(view);
    await fireEvent.click(showAllItem(view));

    expect(view.getByRole("button", { name: "Hide Column 1" })).toBeTruthy();
    expect(view.getByRole("button", { name: "Show Column 2" })).toBeTruthy();
});

it("unchecks show all when a column is hidden afterwards", async () => {
    const view = render(BracketSvg, { chartId: "c", chartJson });
    await waitFor(() =>
        expect(
            view.getByRole("button", { name: "Show Column 2" })
        ).toBeInTheDocument()
    );

    await openMenu(view);
    await fireEvent.click(showAllItem(view));
    await fireEvent.click(view.getByRole("button", { name: "Hide Column 1" }));

    await openMenu(view);
    expect(showAllItem(view)).toHaveAttribute("aria-checked", "false");
});

it("toggles driver names with the show driver names option", async () => {
    const view = render(BracketSvg, { chartId: "c", chartJson });
    await waitFor(() =>
        expect(view.getByText("Ada Lovelace")).toBeInTheDocument()
    );

    await openMenu(view);
    expect(
        view.getByRole("menuitemcheckbox", { name: /Show driver names/ })
    ).toHaveAttribute("aria-checked", "true");
    await fireEvent.click(
        view.getByRole("menuitemcheckbox", { name: /Show driver names/ })
    );
    expect(view.queryByText("Ada Lovelace")).not.toBeInTheDocument();
    expect(view.getByText("42")).toBeInTheDocument();

    await openMenu(view);
    const item = view.getByRole("menuitemcheckbox", {
        name: /Show driver names/,
    });
    expect(item).toHaveAttribute("aria-checked", "false");
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

it("prints the chart SVG with all columns and the header", async () => {
    const view = render(BracketSvg, {
        chartId: "c",
        chartJson,
        imgPath: "NDR/N04double.png",
        chartName: "Saturday Bracket",
    });
    await waitFor(() =>
        expect(
            view.getByRole("button", { name: "Show Column 2" })
        ).toBeInTheDocument()
    );

    await openMenu(view);
    await fireEvent.click(view.getByRole("menuitem", { name: "Print" }));

    await waitFor(() => expect(printSvgElement).toHaveBeenCalledTimes(1));
    const [svg, options] = printSvgElement.mock.calls[0];
    expect(svg).toBe(
        view.getByRole("group", { name: "SVG bracket prototype" })
    );
    expect(options.title).toBe("Saturday Bracket");
    // The SVG handed to print already shows every column and the header.
    expect(svg.querySelector(".header-logo")).not.toBeNull();
    expect(svg.querySelector(".header-title").textContent).toBe(
        "Saturday Bracket"
    );
    expect(view.queryByRole("button", { name: /^Show Column/ })).toBeNull();
    expect(view.queryByRole("menu")).not.toBeInTheDocument();

    await openMenu(view);
    expect(showAllItem(view)).toHaveAttribute("aria-checked", "true");
    expect(
        view.getByRole("menuitemcheckbox", { name: /Show header info/ })
    ).toHaveAttribute("aria-checked", "true");
});

it("shows the chart name in the header, with or without a logo", async () => {
    const withLogo = render(BracketSvg, {
        chartId: "c",
        chartJson,
        imgPath: "AASBD/Double/08double.png",
        chartName: "Junior Division",
    });
    await openMenu(withLogo);
    await fireEvent.click(
        withLogo.getByRole("menuitemcheckbox", { name: /Show header info/ })
    );
    const title = withLogo.container.querySelector(".header-title");
    expect(title.textContent).toBe("Junior Division");
    expect(Number(title.getAttribute("x"))).toBeGreaterThan(
        Number(
            withLogo.container.querySelector(".header-logo").getAttribute("x")
        )
    );
    cleanup();

    const nameOnly = render(BracketSvg, {
        chartId: "c",
        chartJson,
        chartName: "Junior Division",
    });
    const svg = nameOnly.getByRole("group", { name: "SVG bracket prototype" });
    const heightBefore = Number(svg.getAttribute("viewBox").split(" ")[3]);
    await openMenu(nameOnly);
    await fireEvent.click(
        nameOnly.getByRole("menuitemcheckbox", { name: /Show header info/ })
    );
    expect(nameOnly.container.querySelector(".header-logo")).toBeNull();
    expect(nameOnly.container.querySelector(".header-title").textContent).toBe(
        "Junior Division"
    );
    expect(Number(svg.getAttribute("viewBox").split(" ")[3])).toBe(
        heightBefore + 48
    );
});
