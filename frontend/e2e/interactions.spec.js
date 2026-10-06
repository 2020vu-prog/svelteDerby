const { test, expect } = require("./support/test");
const { loadCredentials } = require("./support/credentials");
const { createEventFixture } = require("./support/fixture");
const { openTab, selectEvent } = require("./support/ui");

// Interactions where a child component hands a value to its parent through a
// callback prop (a chart slot click, the ellipsis button on a race card, choosing
// a timer, the walkup link's validity, dragging a chart hot spot). The other flows do not reach them, and the route sweep only loads the
// screens, so a callback that is not wired up would go unnoticed.
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

test("a timer chosen on the timer config screen is saved with the config, and then offered on the capture video screen", async ({
    page,
    request,
}) => {
    await page.goto("/");
    const fixture = await createEventFixture(page, request, { chart: true });
    await selectEvent(page, fixture.eventName);

    // The offline timers are real stored timers, so no timer needs to be running.
    await page.goto("/#/timerConfigElapsed");
    await page.getByRole("button", { name: "View Offline Timers" }).click();
    const timer = page.locator("input[name=activeTimerOption]").first();
    await expect(timer).toBeVisible();
    // the label reads "<emoji> <timer id> <ip address> [<uptime>]"
    const timerId = (
        await page
            .locator("input[name=activeTimerOption] + label")
            .first()
            .innerText()
    ).split(/\s+/)[1];
    expect(timerId).toBeTruthy();
    await timer.click();

    const posted = page.waitForRequest(
        (r) => r.method() === "POST" && /\/timerPbConfig$/.test(r.url())
    );
    await page.getByRole("button", { name: "Update" }).click();
    // the form refuses to submit without a chosen timer, so this proves the
    // choice reached it; the timer id is what it saves
    expect(JSON.parse((await posted).postData())).toMatchObject({
        timerName: "Finish",
        timerMqttClientId: timerId,
    });

    // The saved config is what the capture video screen links a timer to. It
    // reaches the browser through the same asynchronous history load as race
    // data, so refresh and look again until it arrives.
    await page.waitForURL(/#\/RpList/);
    await expect(async () => {
        await page.goto("/#/RpList");
        await page.getByRole("button", { name: "Refresh" }).first().click();
        await page.waitForTimeout(1500);
        await page.goto("/#/captureVideo");
        await expect(
            page.getByRole("button", { name: "Simulate [Finish] Capture" })
        ).toBeVisible({ timeout: 4000 });
    }).toPass({ timeout: 45000 });
});

test("the Add driver button is disabled while the walkup link is not a Spotify track", async ({
    page,
    request,
}) => {
    await page.goto("/");
    const fixture = await createEventFixture(page, request);
    await selectEvent(page, fixture.eventName);

    await page.goto("/#/driverAdd");
    // typed, not filled: the form validates on key presses
    await page.getByPlaceholder("Car Number").pressSequentially("321");
    await page.getByPlaceholder("Driver Name").pressSequentially("Walkup Test");
    const add = page.getByRole("button", { name: "Add" }).first();
    await expect(add).toBeEnabled();

    const link = page.getByPlaceholder(/open\.spotify\.com\/track/);
    await link.fill("not a spotify link");
    await expect(add).toBeDisabled();

    await link.fill("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC");
    await expect(add).toBeEnabled();
});

test("dragging a hot spot in chart edit mode changes the position that Copy Json copies", async ({
    page,
    request,
    context,
}) => {
    await page.goto("/");
    const fixture = await createEventFixture(page, request, { chart: true });
    await selectEvent(page, fixture.eventName);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto(`/#/chartDetail/${fixture.chartId}`);
    // the "E" button turns on edit mode, which makes the hot spots draggable
    await page.locator(".fab").click();
    const copied = async () => {
        await page.getByRole("button", { name: "Copy Json" }).click();
        return JSON.parse(
            await page.evaluate(() => navigator.clipboard.readText())
        );
    };
    const spot = page.locator("#myDIV").first();
    await expect(spot).toBeVisible({ timeout: 20000 });
    const key = (await spot.innerText()).trim().split(/\s+/)[0];
    const before = (await copied()).imgPositions[key];

    // the first hot spot can be below the visible part of the page
    await spot.scrollIntoViewIfNeeded();
    const box = await spot.boundingBox();
    await page.mouse.move(box.x + 5, box.y + 5);
    await page.mouse.down();
    await page.mouse.move(box.x + 25, box.y + 15, { steps: 4 });
    await page.mouse.up();

    // the hot spot adds the drag distance, in pixels, to its chart position
    const after = (await copied()).imgPositions[key];
    expect(after.left).toBe(before.left + 20);
    expect(after.top).toBe(before.top + 10);
});
