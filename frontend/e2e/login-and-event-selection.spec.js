const { test, expect } = require("./support/test");
const { loadCredentials } = require("./support/credentials");
const { createEventFixture } = require("./support/fixture");
const { signIn } = require("./support/login");
const { openEventList, selectEvent } = require("./support/ui");

// Flow 1: an operator signs in through the hosted login page and picks the
// event they are running. Everything after this depends on both working.
const credentials = loadCredentials();
test.skip(
    !credentials,
    "needs test credentials (see e2e/support/credentials.js)"
);

test.describe("signing in", () => {
    // The shared signed-in session is saved by global setup; this one starts
    // from nothing so it covers the real login round trip itself.
    test.use({ storageState: { cookies: [], origins: [] } });

    test("the hosted login page signs the user in, and the session survives a reload", async ({
        page,
    }) => {
        await page.goto("/#/loginH");
        await expect(page.getByRole("button", { name: "Login" })).toBeVisible();

        await signIn(page, credentials);

        await page.reload();
        await expect(page.getByText(/Email: \[.+\]/)).toBeVisible();
        await expect(
            page.getByRole("button", { name: "Logout" })
        ).toBeVisible();
    });
});

test.describe("choosing an event", () => {
    test("an event is chosen from the organization's list and becomes the current event", async ({
        page,
        request,
    }) => {
        await page.goto("/");
        const fixture = await createEventFixture(page, request);

        const eventLink = await openEventList(page, fixture.eventName);
        await expect(eventLink).toBeVisible();
        await eventLink.click();

        await expect(page).toHaveURL(/#\/RpList/);
        await expect(page.getByText(fixture.eventName).first()).toBeVisible();
        await expect(page.getByText("Race Phases")).toBeVisible();
        // the choice sticks: opening the app again lands in the same event
        await page.goto("/");
        await page.goto("/#/RpList");
        await expect(page.getByText(fixture.eventName).first()).toBeVisible();
    });

    test("the event's drivers are available once it is selected", async ({
        page,
        request,
    }) => {
        await page.goto("/");
        const fixture = await createEventFixture(page, request);

        await selectEvent(page, fixture.eventName);

        await page.goto("/#/raceStandingAdd/RacePhase");
        await page.locator("#cn1").click();
        await page.locator("#cn1").pressSequentially("100");

        await expect(page.getByText(fixture.drivers[100])).toBeVisible();
    });
});
