import { render, screen } from "@testing-library/svelte";
import { describe, it, expect, beforeEach } from "vitest";
import Splash from "./Splash.svelte";

// Risk pattern: a sveltestrap component (Modal/ModalHeader/ModalBody). The
// dead `sveltestrap` package is being replaced by `@sveltestrap/sveltestrap`
// (see "The two dependencies that actually gate this" in
// docs/SvelteUpgradeProposal.md) -- this test pins that the modal actually
// renders its content, so that swap can be verified automatically instead of
// by a visual pass over the 25 affected files.
describe("Splash", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("shows the splash modal when it hasn't been seen recently", () => {
        render(Splash);

        expect(
            screen.getByText("RR1.US is the Official Timer App of NDR!"),
        ).toBeInTheDocument();
    });
});
