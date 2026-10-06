import { render, fireEvent, cleanup } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { writable } from "svelte/store";

vi.mock("#src/stores.js", () => ({ theme: writable("blue") }));

import SpinnerButton from "#src/SpinnerButton.svelte";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
    vi.useRealTimers();
    cleanup();
});

describe("SpinnerButton", () => {
    it("calls onClick with the click event", async () => {
        const onClick = vi.fn();
        const view = render(SpinnerButton, { onClick });

        await fireEvent.click(view.getByRole("button"));

        expect(onClick).toHaveBeenCalledTimes(1);
        expect(onClick.mock.calls[0][0]).toBeInstanceOf(MouseEvent);
    });

    it("is disabled while disabled or spinning", () => {
        // A real browser does not deliver clicks to a disabled button, which is
        // what keeps onClick from firing; jsdom does deliver synthetic ones, so
        // this checks the attribute rather than counting calls.
        expect(
            render(SpinnerButton, { disabled: true }).getByRole("button")
        ).toBeDisabled();
        cleanup();
        expect(
            render(SpinnerButton, { spinning: true }).getByRole("button")
        ).toBeDisabled();
        cleanup();
        expect(render(SpinnerButton).getByRole("button")).toBeEnabled();
    });

    it("calls onPress after a long press but not after a short one", async () => {
        const onPress = vi.fn();
        const view = render(SpinnerButton, { onPress });
        const button = view.getByRole("button");

        await fireEvent.mouseDown(button);
        vi.advanceTimersByTime(500);
        await fireEvent.mouseUp(button);
        vi.advanceTimersByTime(2000);
        expect(onPress).not.toHaveBeenCalled();

        await fireEvent.mouseDown(button);
        vi.advanceTimersByTime(1600);
        expect(onPress).toHaveBeenCalledTimes(1);
    });

    it("ignores clicks and presses when no callback, or an undefined one, is given", async () => {
        const plain = render(SpinnerButton);
        await fireEvent.click(plain.getByRole("button"));
        cleanup();
        // `onClick={someCall()}` that returns undefined, as one WIP screen passes
        const undef = render(SpinnerButton, {
            onClick: undefined,
            onPress: undefined,
        });
        await fireEvent.click(undef.getByRole("button"));

        expect(undef.getByRole("button")).toBeInTheDocument();
    });

    it("renders its content and the spinner while spinning", () => {
        const view = render(SpinnerButton, { spinning: true });

        expect(view.getByRole("button")).toBeDisabled();
        expect(view.container.querySelector("svg")).not.toBeNull();
    });
});
