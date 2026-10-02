import { cleanup, fireEvent, render, waitFor } from "@testing-library/svelte";
import { afterEach, expect, it, vi } from "vitest";
import { writable } from "svelte/store";

vi.mock("#src/stores.js", () => ({
    doRefreshBlocks: writable(0),
}));
vi.mock("#src/utils.js", () => ({
    parseHeatPos: vi.fn((position) => [position, position]),
    augmentChartState: vi.fn(() =>
        Promise.resolve({ posHtml: "", bracketClass: "ready", rsFromDexie: {} })
    ),
}));

import BracketSvg from "#src/chart/svg/BracketSvg.svelte";

afterEach(cleanup);

const chartJson = {
    progress: {
        1: { WinnerDest: "2A", LoserDest: "OUT" },
        2: { WinnerDest: "3A", LoserDest: "OUT" },
        3: {
            WinnerDest: "Place1",
            LoserDest: "4A",
            Annotation: "Championship",
        },
        4: { WinnerDest: "Place3", LoserDest: "OUT" },
    },
};

function control(view, name) {
    return view.getByRole("button", { name }).closest("g, [role=button]");
}

it("marks hidden columns with an arrow toward the championship column and a flag on it", async () => {
    const view = render(BracketSvg, { chartId: "c", chartJson });
    const names = [1, 2, 3, 4].map((n) => `Hide Column ${n}`);
    await waitFor(() =>
        expect(view.getByRole("button", { name: names[0] })).toHaveClass(
            "ready"
        )
    );

    // Visible columns show no guide.
    expect(view.container.querySelectorAll(".column-guide")).toHaveLength(0);

    for (const name of names) {
        await fireEvent.click(view.getByRole("button", { name }));
    }

    const guideFor = (n) =>
        control(view, `Show Column ${n}`).querySelector(".column-guide");
    expect([1, 2, 3, 4].map((n) => guideFor(n).classList[1])).toEqual([
        "right",
        "right",
        "flag",
        "left",
    ]);
    // Arrow and flag icons are different glyphs.
    expect(guideFor(1).getAttribute("d")).not.toBe(
        guideFor(4).getAttribute("d")
    );
    expect(guideFor(3).getAttribute("d")).not.toBe(
        guideFor(1).getAttribute("d")
    );
    expect(
        control(view, "Show Column 4").querySelector("title").textContent
    ).toMatch(/Winners advance left/);
    expect(
        control(view, "Show Column 3").querySelector("title").textContent
    ).toMatch(/Championship/);

    // Showing a column removes its guide.
    await fireEvent.click(view.getByRole("button", { name: "Show Column 4" }));
    expect(view.container.querySelectorAll(".column-guide")).toHaveLength(3);
});
