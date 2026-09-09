const { test, expect } = require("@playwright/test");

// The one flow that needs no test credentials: does the bundle actually
// boot and mount the Svelte app, with no uncaught JS error. This is the
// floor Phase 1's diagnostic spike and Phase 2/3's dependency swaps need to
// clear before anything else is worth checking.
test("the app boots without a JS error", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error));

    await page.goto("/");

    await expect(page).toHaveTitle("Derby App");
    expect(pageErrors).toEqual([]);
});

// TODO(Phase 0): the flows that actually matter for a live event --
// login, event selection, race timing/announcing, walkup-track playback --
// need a real test account and fixture data to drive. Fill these in as
// separate spec files once test credentials exist; see the "Phase 0" section
// of docs/SvelteUpgradeProposal.md for the flow list this is meant to cover.
