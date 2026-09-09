const { test, expect } = require("@playwright/test");

// The one flow that needs no test credentials: does the bundle actually
// boot and mount the Svelte app, with no uncaught JS error. This is the
// floor Phase 1's diagnostic spike and Phase 2/3's dependency swaps need to
// clear before anything else is worth checking.
test("the app boots without a JS error", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error));

    await page.goto("/");

    // <title>Derby App</title> is baked into the static index.ejs, so it
    // proves nothing about the bundle -- it's still there verbatim even if
    // bundle.js 404s, or if main.js's startApp() rejects (its config fetch
    // failure is swallowed by a .catch(console.error), not thrown, so
    // pageerror wouldn't catch it either). App.svelte's top-level
    // `<div id="topnav">` only exists once App.svelte has actually mounted,
    // and index.ejs's <body> is empty in the static HTML, so this is real
    // proof Svelte mounted, not just that the page responded.
    await expect(page.locator("#topnav")).toBeVisible();
    expect(pageErrors).toEqual([]);
});

// TODO(Phase 0): the flows that actually matter for a live event --
// login, event selection, race timing/announcing, walkup-track playback --
// need a real test account and fixture data to drive. Fill these in as
// separate spec files once test credentials exist; see the "Phase 0" section
// of docs/SvelteUpgradeProposal.md for the flow list this is meant to cover.
