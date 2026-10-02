import { render, fireEvent, waitFor, cleanup } from "@testing-library/svelte";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { writable } from "svelte/store";

vi.mock("#src/stores.js", () => ({
    raceConfig: writable({}),
    axios: writable({ post: vi.fn().mockResolvedValue({}) }),
    theme: writable("blue"),
    setCacheKey: vi.fn(),
    pushMessage: vi.fn(),
}));
vi.mock("#src/eventDb.js", () => ({
    db: { EventConfig: { get: vi.fn() } },
}));
vi.mock("svelte-spa-router", () => ({
    push: vi.fn(),
    pop: vi.fn(),
    replace: vi.fn(),
}));

import EventAdd from "#src/EventAdd.svelte";
import { raceConfig, axios } from "#src/stores.js";
import { get } from "svelte/store";
import { db } from "#src/eventDb.js";

const selected = { orgIz: "Test Org", orgId: "event1", baseUrl: "/api" };
const settings = { name: "Race", lcl1: "true", pendingRule: "1Race" };
const params = { orgIz: "Test Org", mode: "Update" };

beforeEach(() => {
    vi.clearAllMocks();
    raceConfig.set(selected);
    db.EventConfig.get.mockResolvedValue(settings);
});
afterEach(cleanup);

it("loads and submits the event whose organization matches the URL", async () => {
    const view = render(EventAdd, { params });
    const input = await view.findByDisplayValue("Race");
    expect(db.EventConfig.get).toHaveBeenCalledWith("Test Org:event1");
    await fireEvent.keyUp(input);
    await fireEvent.click(view.getByRole("button", { name: "Update" }));
    expect(get(axios).post).toHaveBeenCalledWith(
        "/api/updateEventConfig",
        expect.objectContaining({
            orgIz: "Test Org",
            orgId: "event1",
            name: "Race",
        })
    );
});

it("does not load or submit an event from a different organization", async () => {
    const view = render(EventAdd, { params: { ...params, orgIz: "OtherOrg" } });
    expect(view.queryByRole("button", { name: "Update" })).toBeNull();
    expect(db.EventConfig.get).not.toHaveBeenCalled();
    expect(get(axios).post).not.toHaveBeenCalled();
});

it("blocks submission when the selected event changes after loading", async () => {
    const view = render(EventAdd, { params });
    await view.findByDisplayValue("Race");
    raceConfig.set({ ...selected, orgId: "event2" });
    await waitFor(() =>
        expect(view.queryByRole("button", { name: "Update" })).toBeNull()
    );
    expect(get(axios).post).not.toHaveBeenCalled();
});

it("discards settings if the event changes while loading", async () => {
    let resolve;
    db.EventConfig.get.mockImplementation(
        () =>
            new Promise((done) => {
                resolve = done;
            })
    );
    const view = render(EventAdd, { params });
    await waitFor(() => expect(db.EventConfig.get).toHaveBeenCalled());
    raceConfig.set({ ...selected, orgId: "event2" });
    resolve(settings);
    await waitFor(() => expect(view.queryByDisplayValue("Race")).toBeNull());
    expect(view.queryByRole("button", { name: "Update" })).toBeNull();
});
