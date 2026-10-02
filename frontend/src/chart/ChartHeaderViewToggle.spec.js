import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { writable } from "svelte/store";

const preferenceValues = vi.hoisted(() => new Map());

vi.mock("svelte-spa-router", () => ({
    replace: vi.fn(),
}));
vi.mock("#src/stores.js", () => ({
    developerMode: writable(false),
}));
vi.mock("#src/eventDb.js", () => ({
    getUserPreference: vi.fn((key) => preferenceValues.get(key) ?? null),
    putUserPreference: vi.fn((key, value) => preferenceValues.set(key, value)),
}));

import { replace } from "svelte-spa-router";
import { developerMode } from "#src/stores.js";
import ChartHeaderViewToggle from "#src/chart/ChartHeaderViewToggle.svelte";

beforeEach(() => {
    preferenceValues.clear();
    developerMode.set(false);
    vi.clearAllMocks();
});

afterEach(cleanup);

it("persists the global view sequence across component remounts", async () => {
    let view = render(ChartHeaderViewToggle, {
        chartId: "chart-1",
        title: "Chart",
    });
    await fireEvent.click(view.getByRole("button"));
    expect(replace).toHaveBeenLastCalledWith("/chartDetailCardList/chart-1");
    view.unmount();

    view = render(ChartHeaderViewToggle, {
        chartId: "chart-2",
        title: "Chart",
    });
    await fireEvent.click(view.getByRole("button"));
    expect(replace).toHaveBeenLastCalledWith("/chartDetail/chart-2");
    expect(preferenceValues.get("pref:chartViewSelectionCounter")).toBe(2);
});

it("includes the SVG selection when developer mode is enabled", async () => {
    developerMode.set(true);
    const view = render(ChartHeaderViewToggle, {
        chartId: "chart-1",
        title: "Chart",
    });

    await fireEvent.click(view.getByRole("button"));
    await fireEvent.click(view.getByRole("button"));

    expect(replace).toHaveBeenNthCalledWith(1, "/chartDetailCardList/chart-1");
    expect(replace).toHaveBeenNthCalledWith(2, "/chartSvgPrototype/chart-1");
});
