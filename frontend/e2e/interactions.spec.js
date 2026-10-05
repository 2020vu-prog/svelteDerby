const { test, expect } = require("./support/test");
const { loadCredentials } = require("./support/credentials");
const { createEventFixture } = require("./support/fixture");
const { openTab, selectEvent } = require("./support/ui");

// Two small interactions that pass events from a child component to its parent
// (a chart slot click and the ellipsis button on a race card). Neither is reached
// by the other flows, and the route sweep only loads the screens, so a broken
// listener would go unnoticed.
test.skip(
    !loadCredentials(),
    "needs test credentials (see e2e/support/credentials.js)"
);

test("clicking a slot on the SVG chart opens that heat's position screen", async ({
    page,
    request,
}) => {
    await page.goto("/");
    const fixture = await createEventFixture(page, request, { chart: true });
    await selectEvent(page, fixture.eventName);

    await page.goto(`/#/chartSvgPrototype/${fixture.chartId}`);
    const slot = page.locator(".slot-target").first();
    await expect(slot).toBeVisible({ timeout: 20000 });
    await slot.click();

    await expect(page).toHaveURL(/#\/ChartPosition\//i);
});

test("the ellipsis button on a pending race shows and hides its toolbar", async ({
    page,
    request,
}) => {
    await page.goto("/");
    const fixture = await createEventFixture(page, request, { chart: true });
    await selectEvent(page, fixture.eventName);
    await openTab(page, "Pending");

    const card = page.locator(".card").filter({ hasText: "Heat: 01" }).first();
    await expect(card).toBeVisible({ timeout: 20000 });
    await expect(card.locator(".card-footer")).toHaveCount(0);
    // the ellipsis is the last icon on the right of the card header
    const ellipsis = card
        .locator(".card-header span[style*='inline-flex']")
        .last();

    await ellipsis.click();
    await expect(card.locator(".card-footer")).toHaveCount(1);

    await ellipsis.click();
    await expect(card.locator(".card-footer")).toHaveCount(0);
});
