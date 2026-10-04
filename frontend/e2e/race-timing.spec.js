const { test, expect } = require("./support/test");
const { loadCredentials } = require("./support/credentials");
const { createEventFixture } = require("./support/fixture");
const { addBlocks, openTab, selectEvent } = require("./support/ui");

// Flow 2: running a race. Cars go on the blocks, the finish times are entered
// for both phases, the result lands in the race history, and the operator can
// make an announcement.
test.skip(
    !loadCredentials(),
    "needs test credentials (see e2e/support/credentials.js)"
);

test.describe("running a race", () => {
    test("both phases of a chart heat are put on the blocks and timed, and the race is recorded", async ({
        page,
        request,
    }) => {
        await page.goto("/");
        const fixture = await createEventFixture(page, request, {
            chart: true,
        });
        await selectEvent(page, fixture.eventName);

        // The chart already created the pending race for heat 01.
        await openTab(page, "Pending");
        await expect(page.getByText("Heat: 01").first()).toBeVisible();

        // Phase A: cars in their lanes; car 100 (lane 1) wins by 250 ms.
        await addBlocks(page, "100", "109");
        await expect(page.getByText(fixture.drivers[100])).toBeVisible();
        await page.locator("button.phase-icon-btn").first().click();
        await expect(page.getByText("Manual Timing Results")).toBeVisible();
        await page.getByPlaceholder("Lane1[100] MS").fill("250");
        await page.getByRole("button", { name: "Apply Time" }).click();
        await page.waitForURL(/#\/RpList/);
        await expect(page.getByText("A: 250")).toBeVisible();

        // Phase B: lanes swapped; car 100 (now lane 2) wins by 300 ms.
        await addBlocks(page, "109", "100");
        await page.locator("button.phase-icon-btn").first().click();
        await page.getByPlaceholder("Lane2[100] MS").fill("300");
        await page.getByRole("button", { name: "Apply Time" }).click();
        await page.waitForURL(/#\/RpList/);
        await expect(page.getByText("B: 300")).toBeVisible();

        // The finished race is in the history with both phase results.
        await openTab(page, "Races");
        await expect(page.getByText("Heat: 01").first()).toBeVisible();
        await expect(page.getByText("A: 250")).toBeVisible();
        await expect(page.getByText("B: 300")).toBeVisible();
    });

    test("cars cannot be put on the blocks in the wrong lanes for phase B", async ({
        page,
        request,
    }) => {
        await page.goto("/");
        const fixture = await createEventFixture(page, request, {
            chart: true,
        });
        await selectEvent(page, fixture.eventName);
        await addBlocks(page, "100", "109");
        await page.locator("button.phase-icon-btn").first().click();
        await page.getByPlaceholder("Lane1[100] MS").fill("250");
        await page.getByRole("button", { name: "Apply Time" }).click();
        await page.waitForURL(/#\/RpList/);

        // Phase B needs the lanes swapped; the same order again is refused by
        // the backend ("Cars in wrong lane(s)"), so no second phase appears.
        await page.goto("/#/raceStandingAdd/RacePhase");
        await page.locator("#cn1").click();
        await page.locator("#cn1").pressSequentially("100");
        await page.locator("#cn2").click();
        await page.locator("#cn2").pressSequentially("109");
        await page.getByRole("button", { name: "Add", exact: true }).click();

        await page.goto("/#/RpList");
        await expect(page.getByText("A: 250")).toBeVisible();
        await expect(page.locator("button.phase-icon-btn")).toHaveCount(0);
    });
});

test.describe("announcing", () => {
    test("a typed announcement is requested from the backend", async ({
        page,
        request,
    }) => {
        await page.goto("/");
        const fixture = await createEventFixture(page, request);
        await selectEvent(page, fixture.eventName);
        await page.goto("/#/ManualAnnouncement");
        await page
            .locator("#announcement")
            .fill("End to end announcement test");

        const [response] = await Promise.all([
            page.waitForResponse((r) =>
                r.url().includes("/initiateAnnouncement")
            ),
            page.getByRole("button", { name: "Announce", exact: true }).click(),
        ]);

        expect(response.status()).toBe(200);
        await expect(page.getByText("Announcement Requested.")).toBeVisible();
    });
});
