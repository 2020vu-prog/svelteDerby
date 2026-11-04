import { describe, it, expect } from "vitest";
import {
    RACE_CONFIG_PREF_KEY,
    neutralReloadUrl,
    selectedEventChangedElsewhere,
} from "#src/crossTabEvent.js";

describe("neutralReloadUrl", () => {
    const base = "https://go.rr1.us/";

    it("drops the hash on an /as/ auto-select route", () => {
        expect(neutralReloadUrl(`${base}#/as/kcMO/kcMO.2ff8b`)).toBe(base);
        expect(
            neutralReloadUrl(
                `${base}#/as/kcMO/kcMO.2ff8b?then=/driverProfile/1`
            )
        ).toBe(base);
    });

    it("drops the hash when the as query requests auto-select", () => {
        expect(neutralReloadUrl(`${base}#/orgSelection?as=1`)).toBe(base);
    });

    it("keeps the path and search of the page", () => {
        expect(
            neutralReloadUrl("https://x.test/app/?v=2#/as/kcMO/kcMO.2ff8b")
        ).toBe("https://x.test/app/?v=2");
    });

    it("returns null for ordinary routes so the page reloads in place", () => {
        expect(neutralReloadUrl(`${base}#/RpList`)).toBeNull();
        expect(neutralReloadUrl(`${base}`)).toBeNull();
        expect(neutralReloadUrl(`${base}#/orgSelection?other=1`)).toBeNull();
    });
});

const stored = (config) => JSON.stringify({ Value: config });
const storageEvent = (init) => new StorageEvent("storage", init);
const current = { orgIz: "kcMO", orgId: "kcMO.2ff8b" };

describe("selectedEventChangedElsewhere", () => {
    it("is true when another tab selects a different event", () => {
        const event = storageEvent({
            key: RACE_CONFIG_PREF_KEY,
            newValue: stored({ orgIz: "kcMO", orgId: "kcMO.453fe" }),
        });
        expect(selectedEventChangedElsewhere(event, current)).toBe(true);
    });

    it("is false for updates to the same event", () => {
        const event = storageEvent({
            key: RACE_CONFIG_PREF_KEY,
            newValue: stored({ ...current, name: "renamed" }),
        });
        expect(selectedEventChangedElsewhere(event, current)).toBe(false);
    });

    it("is false for other preference keys", () => {
        const event = storageEvent({
            key: "pref:theme",
            newValue: stored("dark"),
        });
        expect(selectedEventChangedElsewhere(event, current)).toBe(false);
    });

    it("is true when the selection is removed or storage is cleared", () => {
        const removed = storageEvent({
            key: RACE_CONFIG_PREF_KEY,
            newValue: null,
        });
        const cleared = storageEvent({ key: null, newValue: null });
        expect(selectedEventChangedElsewhere(removed, current)).toBe(true);
        expect(selectedEventChangedElsewhere(cleared, current)).toBe(true);
    });

    it("is false when no event is selected in either tab", () => {
        const event = storageEvent({
            key: RACE_CONFIG_PREF_KEY,
            newValue: null,
        });
        expect(
            selectedEventChangedElsewhere(event, { orgIz: "", orgId: "" })
        ).toBe(false);
    });

    it("treats unparseable stored values as no selection", () => {
        const event = storageEvent({
            key: RACE_CONFIG_PREF_KEY,
            newValue: "{not json",
        });
        expect(selectedEventChangedElsewhere(event, current)).toBe(true);
    });
});
