import { render, fireEvent, waitFor, cleanup } from "@testing-library/svelte";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { writable } from "svelte/store";

vi.mock("#src/stores.js", () => ({
    raceConfig: writable({
        orgId: "event1",
        orgIz: "Test Org",
        baseUrl: "/api",
    }),
    axios: writable({
        get: vi.fn(),
        post: vi.fn(),
    }),
    theme: writable("blue"),
    getCacheKey: vi.fn(() => "cache"),
    getChartCacheKey: vi.fn(() => "chartCache"),
    doRefreshBlocks: writable(0),
}));
vi.mock("#src/eventDb.js", () => ({
    db: { BracketMetaData: { toArray: vi.fn() } },
}));
vi.mock("svelte-spa-router", () => ({
    push: vi.fn(),
    pop: vi.fn(),
    replace: vi.fn(),
}));

import ChartAdd from "#src/ChartAdd.svelte";
import { axios } from "#src/stores.js";
import { db } from "#src/eventDb.js";
import { pop } from "svelte-spa-router";
import { get } from "svelte/store";

const listing = {
    Contents: [
        "data/brackets/AASBD/Double/08double.png",
        "data/brackets/AASBD/Double/08double.json",
        "data/brackets/AASBD/Double/08double.combined.json",
        "data/brackets/AASBD/Single/12single.png",
        "data/brackets/NDR/N04double.png",
    ].map((Key) => ({ Key })),
};

beforeEach(() => {
    vi.clearAllMocks();
    db.BracketMetaData.toArray.mockResolvedValue([]);
    get(axios).get.mockResolvedValue({ data: listing });
    get(axios).post.mockResolvedValue({});
});
afterEach(cleanup);

const addButton = (view) => view.getByRole("button", { name: "Add" });

it("loads the chart list without jQuery or jsTree", async () => {
    const view = render(ChartAdd);
    expect(view.getByText("Loading charts...")).toBeInTheDocument();

    await view.findByLabelText("08double.png");
    expect(get(axios).get).toHaveBeenCalledWith(
        "/api/listChartTypes",
        expect.objectContaining({
            params: expect.objectContaining({
                orgId: "event1",
                orgIz: "Test Org",
            }),
        })
    );
    // Only chart images are offered, grouped by folder.
    expect(
        [...view.container.querySelectorAll("input[name=chartTree]")].map(
            (radio) => radio.value
        )
    ).toEqual([
        "AASBD/Double/08double.png",
        "AASBD/Single/12single.png",
        "NDR/N04double.png",
    ]);
    expect(document.querySelector("script[src*='jquery']")).toBeNull();
    expect(document.querySelector("link[href*='jstree']")).toBeNull();
    expect(view.container.querySelector("#jstree_demo_div")).toBeNull();
});

it("shows an error when the chart list cannot be loaded", async () => {
    get(axios).get.mockRejectedValue(new Error("offline"));
    const view = render(ChartAdd);

    expect(
        await view.findByText("Unable to load the list of charts.")
    ).toBeInTheDocument();
});

it("adds the chosen chart under the typed name", async () => {
    const view = render(ChartAdd);
    await view.findByLabelText("08double.png");
    await fireEvent.click(view.getByLabelText("Manual"));
    expect(addButton(view)).toBeDisabled();

    await fireEvent.click(view.getByLabelText("08double.png"));
    expect(
        view.getByText("Chart Selected: AASBD/Double/08double.png")
    ).toBeInTheDocument();
    // A chart alone is not enough.
    expect(addButton(view)).toBeDisabled();

    await fireEvent.input(view.getByPlaceholderText("Chart Name"), {
        target: { value: "Sat AM Stock" },
    });
    await waitFor(() => expect(addButton(view)).toBeEnabled());
    await fireEvent.click(addButton(view));

    expect(get(axios).post).toHaveBeenCalledWith("/api/addChart", {
        orgId: "event1",
        orgIz: "Test Org",
        imgPath: "AASBD/Double/08double.png",
        jsonPath: "AASBD/Double/08double.combined.json",
        bracketName: "Sat AM Stock",
    });
    await waitFor(() => expect(pop).toHaveBeenCalled());
});

it("keeps Add disabled until a chart is chosen, and follows a changed choice", async () => {
    const view = render(ChartAdd);
    await view.findByLabelText("08double.png");
    await fireEvent.click(view.getByLabelText("Manual"));
    await fireEvent.input(view.getByPlaceholderText("Chart Name"), {
        target: { value: "Name only" },
    });
    expect(addButton(view)).toBeDisabled();

    await fireEvent.click(view.getByLabelText("N04double.png"));
    await waitFor(() => expect(addButton(view)).toBeEnabled());
    await fireEvent.click(view.getByLabelText("12single.png"));
    await fireEvent.click(addButton(view));

    expect(get(axios).post).toHaveBeenCalledWith(
        "/api/addChart",
        expect.objectContaining({
            imgPath: "AASBD/Single/12single.png",
            jsonPath: "AASBD/Single/12single.combined.json",
        })
    );
});

it("warns when the chart name is already used", async () => {
    db.BracketMetaData.toArray.mockResolvedValue([
        { bracketName: "Sat AM Stock", del: false },
    ]);
    const view = render(ChartAdd);
    await view.findByLabelText("08double.png");
    await fireEvent.click(view.getByLabelText("Manual"));
    await fireEvent.input(view.getByPlaceholderText("Chart Name"), {
        target: { value: "sat am stock" },
    });

    expect(
        await view.findByText(
            /A non-hidden chart with this name already exists/
        )
    ).toBeInTheDocument();
});
