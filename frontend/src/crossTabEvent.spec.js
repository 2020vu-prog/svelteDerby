import { describe, it, expect, vi, afterEach } from "vitest";
import {
    RACE_CONFIG_PREF_KEY,
    watchSelectedEventAcrossTabs,
} from "#src/crossTabEvent.js";

const stored = (config) => JSON.stringify({ Value: config });
const fire = (init) => window.dispatchEvent(new StorageEvent("storage", init));

describe("watchSelectedEventAcrossTabs", () => {
    let stop;
    afterEach(() => stop && stop());

    const watch = (current) => {
        const onChange = vi.fn();
        stop = watchSelectedEventAcrossTabs({
            getCurrent: () => current,
            onChange,
        });
        return onChange;
    };

    it("reports when another tab selects a different event", () => {
        const onChange = watch({ orgIz: "kcMO", orgId: "kcMO.2ff8b" });
        const other = { orgIz: "kcMO", orgId: "kcMO.453fe" };
        fire({ key: RACE_CONFIG_PREF_KEY, newValue: stored(other) });
        expect(onChange).toHaveBeenCalledWith(other);
    });

    it("ignores updates to the same event", () => {
        const onChange = watch({ orgIz: "kcMO", orgId: "kcMO.2ff8b" });
        const same = { orgIz: "kcMO", orgId: "kcMO.2ff8b", name: "renamed" };
        fire({ key: RACE_CONFIG_PREF_KEY, newValue: stored(same) });
        expect(onChange).not.toHaveBeenCalled();
    });

    it("ignores other preference keys", () => {
        const onChange = watch({ orgIz: "kcMO", orgId: "kcMO.2ff8b" });
        fire({ key: "pref:theme", newValue: stored("dark") });
        expect(onChange).not.toHaveBeenCalled();
    });

    it("reports when the selection is removed or storage is cleared", () => {
        const onChange = watch({ orgIz: "kcMO", orgId: "kcMO.2ff8b" });
        fire({ key: RACE_CONFIG_PREF_KEY, newValue: null });
        fire({ key: null, newValue: null });
        expect(onChange).toHaveBeenCalledTimes(2);
    });

    it("does nothing when no event was selected in either tab", () => {
        const onChange = watch({ orgIz: "", orgId: "" });
        fire({ key: RACE_CONFIG_PREF_KEY, newValue: null });
        expect(onChange).not.toHaveBeenCalled();
    });

    it("tolerates unparseable stored values", () => {
        const onChange = watch({ orgIz: "kcMO", orgId: "kcMO.2ff8b" });
        fire({ key: RACE_CONFIG_PREF_KEY, newValue: "{not json" });
        expect(onChange).toHaveBeenCalledWith(null);
    });

    it("stops listening after cleanup", () => {
        const onChange = watch({ orgIz: "kcMO", orgId: "kcMO.2ff8b" });
        stop();
        fire({
            key: RACE_CONFIG_PREF_KEY,
            newValue: stored({ orgIz: "kcMO", orgId: "kcMO.453fe" }),
        });
        expect(onChange).not.toHaveBeenCalled();
    });
});
