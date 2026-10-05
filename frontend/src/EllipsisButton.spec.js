import { render, fireEvent } from "@testing-library/svelte";
import { describe, it, expect, vi } from "vitest";
import EllipsisButton from "#src/EllipsisButton.svelte";

describe("EllipsisButton", () => {
    it("calls onMessage with its text on click", async () => {
        const onMessage = vi.fn();
        const { container } = render(EllipsisButton, { onMessage });

        await fireEvent.click(container.querySelector("span"));

        expect(onMessage).toHaveBeenCalledTimes(1);
        expect(onMessage).toHaveBeenCalledWith({ text: "Info!" });
    });

    it("does nothing visible when no listener is given", async () => {
        const { container } = render(EllipsisButton);

        await fireEvent.click(container.querySelector("span"));

        expect(container.querySelector("span")).not.toBeNull();
    });
});
