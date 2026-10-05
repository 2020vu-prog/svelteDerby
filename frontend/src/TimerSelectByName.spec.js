import { render, fireEvent, waitFor, cleanup } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";

vi.mock("#src/eventDb.js", () => ({
    db: {
        TimerPbConfig: {
            toArray: vi.fn(),
        },
    },
}));
vi.mock("#src/utils.js", () => ({
    getTimerPbConfig: vi.fn(),
}));

import TimerSelectByName from "#src/TimerSelectByName.svelte";
import { db } from "#src/eventDb.js";
import { getTimerPbConfig } from "#src/utils.js";

beforeEach(() => {
    vi.clearAllMocks();
    db.TimerPbConfig.toArray.mockResolvedValue([
        { SK: "Finish" },
        { SK: "Ramps" },
    ]);
    getTimerPbConfig.mockImplementation(async (sk) => [
        { timerMqttClientId: `client-${sk}` },
    ]);
});
afterEach(cleanup);

describe("TimerSelectByName", () => {
    it("reports the preselected timer to onSelect once the list has loaded", async () => {
        const onSelect = vi.fn();
        render(TimerSelectByName, { preSelect: "Finish", onSelect });

        await waitFor(() => expect(onSelect).toHaveBeenCalledTimes(1));
        expect(onSelect).toHaveBeenCalledWith({
            text: "Finish",
            SK: "Finish",
            decoded: { timerMqttClientId: "client-Finish" },
        });
    });

    it("calls onSelect again with the timer the user picks", async () => {
        const onSelect = vi.fn();
        const view = render(TimerSelectByName, {
            preSelect: "Finish",
            onSelect,
        });
        await waitFor(() => expect(onSelect).toHaveBeenCalledTimes(1));

        await fireEvent.change(view.getByRole("combobox"), {
            target: { value: "Ramps" },
        });

        await waitFor(() => expect(onSelect).toHaveBeenCalledTimes(2));
        expect(onSelect).toHaveBeenLastCalledWith({
            text: "Ramps",
            SK: "Ramps",
            decoded: { timerMqttClientId: "client-Ramps" },
        });
    });

    it("lists the stored timers and can be disabled", async () => {
        const view = render(TimerSelectByName, { mode: "disabled" });

        await waitFor(() =>
            expect(
                view.getAllByRole("option").map((option) => option.textContent)
            ).toEqual(["Finish", "Ramps"])
        );
        expect(view.getByRole("combobox")).toBeDisabled();
    });
});
