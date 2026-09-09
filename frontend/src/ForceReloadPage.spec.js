import { render, waitFor } from "@testing-library/svelte";
import { describe, it, expect } from "vitest";
import ForceReloadPage from "./ForceReloadPage.svelte";

// Risk pattern: svelte-spa-router's push/pop/replace, the load-bearing
// routing layer touched by 53 of 94 files (see docs/SvelteUpgradeProposal.md).
// ForceReloadPage's whole job is to call pop() on mount -- this test pins
// that it actually navigates the browser back, so the router's v2 -> v5
// migration (a real rewrite, not a version bump) can be checked automatically
// instead of by clicking through routes by hand.
describe("ForceReloadPage", () => {
    it("navigates back on mount", async () => {
        window.location.hash = "#/first";
        window.location.hash = "#/second";
        expect(window.location.hash).toBe("#/second");

        render(ForceReloadPage);

        await waitFor(() => {
            expect(window.location.hash).toBe("#/first");
        });
    });
});
