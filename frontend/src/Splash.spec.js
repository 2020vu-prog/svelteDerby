import { render, screen } from "@testing-library/svelte";
import { describe, it, expect, beforeEach } from "vitest";
import Splash from "#src/Splash.svelte";

// Pins that the modal (ui/Modal, ModalHeader, ModalBody) actually renders its
// content. It caught `sveltestrap` printing slot content as text under Svelte 5
// (see "Svelte 5 spike notes" in docs/TODO/SvelteUpgradeProposal.md).
describe("Splash", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("shows the splash modal when it hasn't been seen recently", () => {
        render(Splash);

        expect(
            screen.getByText("RR1.US is the Official Timer App of NDR!")
        ).toBeInTheDocument();
    });
});
