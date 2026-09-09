import { render, fireEvent } from "@testing-library/svelte";
import { describe, it, expect } from "vitest";
import EllipsisButton from "./EllipsisButton.svelte";

// Risk pattern: createEventDispatcher(). Svelte 5 idioms replace this with
// callback props (see Phase 4 in docs/SvelteUpgradeProposal.md) -- this test
// pins today's dispatch-based behavior so that migration can be verified
// automatically instead of by hand.
describe("EllipsisButton", () => {
    it("dispatches a message event on click", async () => {
        const { container, component } = render(EllipsisButton);
        let received;
        component.$on("message", (event) => {
            received = event.detail;
        });

        await fireEvent.click(container.querySelector("span"));

        expect(received).toEqual({ text: "Info!" });
    });
});
