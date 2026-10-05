import { render, fireEvent, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import { writable } from "svelte/store";

vi.mock("#src/stores.js", () => ({ theme: writable("blue") }));
vi.mock("svelte-spa-router", () => ({
    push: vi.fn(),
    pop: vi.fn(),
    replace: vi.fn(),
}));

import Annotate from "#src/Annotate.svelte";
import { push } from "svelte-spa-router";

afterEach(cleanup);

const openMenu = async (view) => {
    await fireEvent.click(
        view.getByRole("button", { name: "Annotation menu" })
    );
};

describe("Annotate menu", () => {
    it("calls onMenu with the chosen item, then runs its action", async () => {
        const action = vi.fn();
        const onMenu = vi.fn();
        const item = { text: "Do it", action };
        const view = render(Annotate, { text: "Note", menu: [item], onMenu });

        await openMenu(view);
        await fireEvent.click(view.getByRole("button", { name: "Do it" }));

        expect(onMenu).toHaveBeenCalledTimes(1);
        expect(onMenu).toHaveBeenCalledWith(item);
        expect(action).toHaveBeenCalledWith(item);
        expect(view.queryByRole("button", { name: "Do it" })).toBeNull();
    });

    it("navigates to a menuRoute item", async () => {
        const view = render(Annotate, {
            text: "Note",
            menu: [{ text: "Go", menuRoute: "/somewhere" }],
        });

        await openMenu(view);
        await fireEvent.click(view.getByRole("button", { name: "Go" }));

        expect(push).toHaveBeenCalledWith("/somewhere");
    });

    it("has no menu button without items", () => {
        const view = render(Annotate, { text: "Note" });

        expect(
            view.queryByRole("button", { name: "Annotation menu" })
        ).toBeNull();
    });
});
