import { render, fireEvent, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import { writable } from "svelte/store";

vi.mock("#src/stores.js", () => ({ theme: writable("blue") }));

import TimerHistoryAge from "#src/TimerHistoryAge.svelte";

afterEach(cleanup);

describe("TimerHistoryAge", () => {
    it("hides its controls until the gear is clicked, then calls onRefresh from Get History", async () => {
        const onRefresh = vi.fn();
        const view = render(TimerHistoryAge, { onRefresh });
        expect(view.queryByText("Get History")).toBeNull();

        await fireEvent.click(view.getByText("⚙️"));
        await fireEvent.click(
            view.getByRole("button", { name: "Get History" })
        );

        expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it("shows the default history ages and lets them be edited", async () => {
        const view = render(TimerHistoryAge);
        await fireEvent.click(view.getByText("⚙️"));

        expect(view.getByPlaceholderText("HistoryAge")).toHaveValue("PT20M");
        expect(view.getByPlaceholderText("HistoryEndAge")).toHaveValue("PT0S");
        await fireEvent.input(view.getByPlaceholderText("HistoryAge"), {
            target: { value: "PT1H" },
        });
        expect(view.getByPlaceholderText("HistoryAge")).toHaveValue("PT1H");
    });

    it("does nothing when no listener is given", async () => {
        const view = render(TimerHistoryAge);
        await fireEvent.click(view.getByText("⚙️"));

        await fireEvent.click(
            view.getByRole("button", { name: "Get History" })
        );

        expect(view.getByText("Get History")).toBeInTheDocument();
    });
});
