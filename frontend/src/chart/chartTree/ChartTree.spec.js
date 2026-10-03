import { render, fireEvent, cleanup } from "@testing-library/svelte";
import { afterEach, expect, it } from "vitest";

import ChartTree from "#src/chart/chartTree/ChartTree.svelte";
import { buildChartTree } from "#src/chart/chartTree/chartTree.js";

afterEach(cleanup);

const nodes = buildChartTree(
    [
        "data/brackets/AASBD/Double/08double.png",
        "data/brackets/AASBD/Single/12single.png",
        "data/brackets/NDR/N04double.png",
    ].map((Key) => ({ Key }))
);

const openFolders = (view) =>
    [...view.container.querySelectorAll("details")]
        .filter((details) => details.open)
        .map((details) => details.querySelector("summary").textContent.trim());

it("lists folders collapsed, with every chart a radio button in one group", () => {
    const view = render(ChartTree, { nodes });

    const root = view.container.querySelector(".chart-tree");
    expect(
        [...root.children].map(
            (item) => item.querySelector("details > summary").textContent
        )
    ).toEqual(["AASBD", "NDR"]);
    expect(openFolders(view)).toEqual([]);

    const radios = view.getAllByRole("radio", { hidden: true });
    expect(radios.map((radio) => radio.value)).toEqual([
        "AASBD/Double/08double.png",
        "AASBD/Single/12single.png",
        "NDR/N04double.png",
    ]);
    expect(new Set(radios.map((radio) => radio.name)).size).toBe(1);
    expect(radios.some((radio) => radio.checked)).toBe(false);
});

it("announces the chart the user picks", async () => {
    const picks = [];
    const view = render(ChartTree, { nodes });
    view.component.$on("select", (event) => picks.push(event.detail));

    await fireEvent.click(view.getByLabelText("12single.png"));
    await fireEvent.click(view.getByLabelText("N04double.png"));

    expect(picks).toEqual(["AASBD/Single/12single.png", "NDR/N04double.png"]);
});

it("checks the selected chart and opens only the folders that hold it", async () => {
    const view = render(ChartTree, {
        nodes,
        selected: "AASBD/Double/08double.png",
    });

    expect(view.getByLabelText("08double.png")).toBeChecked();
    expect(view.getByLabelText("12single.png")).not.toBeChecked();
    expect(openFolders(view)).toEqual(["AASBD", "Double"]);

    await view.component.$set({ selected: "NDR/N04double.png" });
    expect(view.getByLabelText("N04double.png")).toBeChecked();
    expect(view.getByLabelText("08double.png")).not.toBeChecked();
    expect(openFolders(view)).toContain("NDR");
});

it("uses the given group name and renders nothing for an empty tree", () => {
    const named = render(ChartTree, { nodes, name: "chartFile" });
    expect(
        named
            .getAllByRole("radio", { hidden: true })
            .every((radio) => radio.name === "chartFile")
    ).toBe(true);
    cleanup();

    const empty = render(ChartTree, { nodes: [] });
    expect(empty.queryAllByRole("radio", { hidden: true })).toHaveLength(0);
});

it("leaves folders the user opened alone when another chart is chosen", async () => {
    const view = render(ChartTree, { nodes });
    const ndr = [...view.container.querySelectorAll("details")].find(
        (details) => details.querySelector("summary").textContent === "NDR"
    );

    // The user opens NDR by hand (the browser fires "toggle").
    ndr.open = true;
    await fireEvent(ndr, new Event("toggle"));
    await view.component.$set({ selected: "AASBD/Double/08double.png" });

    expect(openFolders(view)).toEqual(["AASBD", "Double", "NDR"]);

    // Closing one by hand sticks as well, until a chart inside it is chosen.
    ndr.open = false;
    await fireEvent(ndr, new Event("toggle"));
    await view.component.$set({ selected: "AASBD/Single/12single.png" });
    expect(openFolders(view)).toEqual(["AASBD", "Double", "Single"]);
});

it("indents each level of folders under its parent", () => {
    const view = render(ChartTree, {
        nodes,
        selected: "AASBD/Double/08double.png",
    });

    const lists = [...view.container.querySelectorAll("ul.chart-tree")];
    const depthOf = (list) => {
        let depth = 0;
        for (let up = list.parentElement; up; up = up.parentElement) {
            if (up.matches("ul.chart-tree")) depth++;
        }
        return depth;
    };
    const indent = (list) => parseFloat(list.style.marginLeft) || 0;

    // The top level is flush left; every nested list sits one step further in.
    expect(lists.length).toBeGreaterThan(2);
    for (const list of lists) {
        expect(indent(list)).toBe(depthOf(list) ? 1.25 : 0);
    }
    expect(Math.max(...lists.map(depthOf))).toBeGreaterThanOrEqual(2);
    // So a chart is indented under its folder, which is under its parent.
    const chart = view.getByLabelText("08double.png").closest("ul.chart-tree");
    expect(depthOf(chart)).toBe(2);
});
