import { cleanup, fireEvent, render, waitFor } from "@testing-library/svelte";
import { afterEach, expect, it, vi } from "vitest";
import { writable } from "svelte/store";

vi.mock("#src/stores.js", () => ({
    doRefreshBlocks: writable(0),
}));
vi.mock("#src/utils.js", () => ({
    parseHeatPos: vi.fn((position) => [position, position]),
    getHeatResultParts: vi.fn(() => []),
    augmentChartState: vi.fn((_chartJson, _chartId, heatId, slot) =>
        Promise.resolve({
            posHtml: heatId === "1" && slot === "A" ? " - 42 Ada Lovelace" : "",
            bracketClass: "ready",
            // No cars in heat 2's column, so it is hidden in the default view.
            rsFromDexie: heatId === "2" ? undefined : {},
        })
    ),
}));
vi.mock("#src/chart/svg/printSvg.js", () => ({ printSvgElement: vi.fn() }));

import BracketSvg from "#src/chart/svg/BracketSvg.svelte";
import { printSvgElement } from "#src/chart/svg/printSvg.js";
import { augmentChartState } from "#src/utils.js";

const defaultAugmentChartState = augmentChartState.getMockImplementation();

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    augmentChartState.mockImplementation(defaultAugmentChartState);
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
    ).toEqual([
        "Show all columns",
        "Print",
        "Show header info",
        "Show driver names",
        "Show heat results",
    ]);

    await fireEvent.keyDown(window, { key: "Escape" });
    expect(view.queryByRole("menu")).not.toBeInTheDocument();

    await openMenu(view);
    await fireEvent.click(document.body);
    expect(view.queryByRole("menu")).not.toBeInTheDocument();
});

function showAllItem(view) {
    return view.getByRole("menuitemcheckbox", { name: /Show all columns/ });
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
        eventName: "Spring Rally",
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
    expect(svg.querySelector(".header-event").textContent).toBe("Spring Rally");
    expect(view.queryByRole("button", { name: /^Show Column/ })).toBeNull();
    expect(view.queryByRole("menu")).not.toBeInTheDocument();

    await openMenu(view);
    expect(showAllItem(view)).toHaveAttribute("aria-checked", "true");
    expect(
        view.getByRole("menuitemcheckbox", { name: /Show header info/ })
    ).toHaveAttribute("aria-checked", "true");
});

it("waits for newly shown column statuses before printing", async () => {
    const view = render(BracketSvg, { chartId: "c", chartJson });
    await waitFor(() =>
        expect(
            view.getByRole("button", { name: "Show Column 2" })
        ).toBeInTheDocument()
    );

    const pending = [];
    augmentChartState.mockImplementation(
        (_chartJson, _chartId, heatId, slot) =>
            new Promise((resolve) =>
                pending.push(() =>
                    resolve({
                        bracketClass: "pendingSeed",
                        posHtml: `${heatId}${slot}`,
                    })
                )
            )
    );

    await openMenu(view);
    await fireEvent.click(view.getByRole("menuitem", { name: "Print" }));
    await waitFor(() => expect(pending).toHaveLength(2));
    expect(printSvgElement).not.toHaveBeenCalled();

    pending.splice(0).forEach((resolve) => resolve());
    await waitFor(() => expect(printSvgElement).toHaveBeenCalledTimes(1));
    const heat2 = [...view.container.querySelectorAll(".heat")].find(
        (heat) => heat.querySelector(".heat-number")?.textContent === "Heat 2"
    );
    expect(heat2.querySelectorAll(".slot.pendingSeed")).toHaveLength(2);
});

// The chart hides its default columns once their statuses have loaded, which
// narrows the viewBox shortly after mount. Read the viewBox at the point of
// use, never once right after render, or the result depends on whether that
// asynchronous load has finished yet.
const viewBoxOf = (svg) => svg.getAttribute("viewBox").split(" ").map(Number);

it("centers the event name above the chart name above the logo", async () => {
    const view = render(BracketSvg, {
        chartId: "c",
        chartJson,
        imgPath: "AASBD/Double/08double.png",
        chartName: "Junior Division",
        eventName: "Spring Rally",
    });
    const svg = view.getByRole("group", { name: "SVG bracket prototype" });

    await openMenu(view);
    const heightBefore = viewBoxOf(svg)[3];
    await fireEvent.click(
        view.getByRole("menuitemcheckbox", { name: /Show header info/ })
    );
    const width = viewBoxOf(svg)[2];

    const logo = view.container.querySelector(".header-logo");
    const event = view.container.querySelector(".header-event");
    const title = view.container.querySelector(".header-title");
    expect(event.textContent).toBe("Spring Rally");
    expect(title.textContent).toBe("Junior Division");
    expect(
        Number(logo.getAttribute("x")) + Number(logo.getAttribute("width")) / 2
    ).toBe(width / 2);
    for (const text of [event, title]) {
        expect(Number(text.getAttribute("x"))).toBe(width / 2);
        expect(text.getAttribute("text-anchor")).toBe("middle");
    }
    expect(Number(event.getAttribute("y"))).toBeLessThan(
        Number(title.getAttribute("y"))
    );
    expect(Number(title.getAttribute("y")) + 14).toBeLessThanOrEqual(
        Number(logo.getAttribute("y"))
    );
    expect(Number(svg.getAttribute("viewBox").split(" ")[3])).toBe(
        heightBefore + 96 + 48 + 48
    );
});

it("shows only the event name when the chart has no logo or chart name", async () => {
    const view = render(BracketSvg, {
        chartId: "c",
        chartJson,
        eventName: "Spring Rally",
    });
    await openMenu(view);
    await fireEvent.click(
        view.getByRole("menuitemcheckbox", { name: /Show header info/ })
    );

    expect(view.container.querySelector(".header-event").textContent).toBe(
        "Spring Rally"
    );
    expect(view.container.querySelector(".header-title")).toBeNull();
    expect(view.container.querySelector(".header-logo")).toBeNull();
});

it("shows just the centered chart name when the chart has no logo", async () => {
    const view = render(BracketSvg, {
        chartId: "c",
        chartJson,
        chartName: "Junior Division",
    });
    const svg = view.getByRole("group", { name: "SVG bracket prototype" });

    await openMenu(view);
    const heightBefore = viewBoxOf(svg)[3];
    await fireEvent.click(
        view.getByRole("menuitemcheckbox", { name: /Show header info/ })
    );
    const width = viewBoxOf(svg)[2];

    expect(view.container.querySelector(".header-logo")).toBeNull();
    const title = view.container.querySelector(".header-title");
    expect(title.textContent).toBe("Junior Division");
    expect(Number(title.getAttribute("x"))).toBe(width / 2);
    expect(Number(svg.getAttribute("viewBox").split(" ")[3])).toBe(
        heightBefore + 48
    );
});

it("increases and resets the white space between columns", async () => {
    const view = render(BracketSvg, { chartId: "c", chartJson });
    // Distance between the first two column buttons grows with the spacing.
    const columnDistance = () => {
        const [first, second] = [
            ...view.container.querySelectorAll(".column-control"),
        ].map((el) =>
            Number(
                el.getAttribute("transform").match(/translate\(([-\d.]+)/)[1]
            )
        );
        return second - first;
    };
    // Wait for the default view (column 2 hidden) to settle before measuring.
    await waitFor(() =>
        expect(
            view.getByRole("button", { name: "Show Column 2" })
        ).toBeInTheDocument()
    );
    const distance0 = columnDistance();

    const menu = await openMenu(view);
    const increase = view.getByRole("button", {
        name: "Increase column spacing",
    });
    const decrease = view.getByRole("button", {
        name: "Decrease column spacing",
    });
    expect(menu).toHaveTextContent("Column spacing");
    expect(menu).toHaveTextContent("Default");
    expect(decrease).toBeDisabled();

    await fireEvent.click(increase);
    // The menu stays open while adjusting.
    expect(view.getByRole("menu")).toBeInTheDocument();
    expect(columnDistance()).toBe(distance0 + 24);
    expect(view.getByRole("menu")).toHaveTextContent("1");

    await fireEvent.click(increase);
    expect(columnDistance()).toBe(distance0 + 48);

    await fireEvent.click(decrease);
    await fireEvent.click(decrease);
    expect(columnDistance()).toBe(distance0);
    expect(view.getByRole("menu")).toHaveTextContent("Default");
    expect(decrease).toBeDisabled();

    for (let i = 0; i < 12; i++) await fireEvent.click(increase);
    expect(increase).toBeDisabled();
    expect(columnDistance()).toBe(distance0 + 10 * 24);
});
