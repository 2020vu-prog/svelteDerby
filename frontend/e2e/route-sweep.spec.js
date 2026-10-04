const { test, expect } = require("./support/test");
const { loadCredentials } = require("./support/credentials");
const { createEventFixture } = require("./support/fixture");
const { selectEvent } = require("./support/ui");
const routeCatalog = require("../src/routes/routeCatalog.js");

// Every routed screen opens without an uncaught JavaScript error. The flow
// specs cover the screens an operator uses most; this sweep covers the rest,
// so a framework or dependency upgrade that breaks a screen nobody opens in a
// flow still fails here.
test.skip(
    !loadCredentials(),
    "needs test credentials (see e2e/support/credentials.js)"
);

// Routes that are not swept: they navigate away, need a camera, or hand off to
// another service by design.
const SKIPPED = new Set([
    "forceReload",
    "forceLoad",
    "captureVideo",
    "spotify",
    "login",
]);

// Existing errors, present before the Svelte upgrade work (found by running
// this sweep against the deployed Svelte 3 build). When one is fixed this test
// fails until its entry is removed, so the list cannot go stale.
const KNOWN_ERRORS = {
    "timerPbAlignment /timerPbAlignment": [
        "PAGEERROR Invalid argument to Table.get()",
    ],
    "rawTimers /rawTimerList": ["PAGEERROR err is not defined"],
};

function routeFor(definition, fixture) {
    const values = {
        type: definition.id === "raceStandingAdd" ? "RaceStanding" : "Pending",
        mode: definition.id === "eventAdd" ? "Add" : "menu",
        rpKey: "1000",
        number: "100",
        orgIz: "Test",
        orgId: fixture.orgId,
        token: "tok",
        PK: "Test:RS",
        SK: "x",
        b64User: "e30=",
        chartId: fixture.chartId,
        chartPosition: "01A",
        b64route: "L1JwTGlzdA==",
        dbName: "a",
        dbKey: "b",
        winningLane: "1",
        winningTime: "100",
    };
    // optional parameters are left out; required ones are filled in
    return definition.path.replace(/\/:(\w+)(\?)?/g, (match, name, optional) =>
        optional ? "" : `/${values[name] ?? "x"}`
    );
}

test("every route opens without an uncaught error", async ({
    page,
    request,
    context,
}) => {
    test.setTimeout(420000);
    await page.goto("/");
    const fixture = await createEventFixture(page, request, { chart: true });
    await selectEvent(page, fixture.eventName);

    const errorsByRoute = {};
    for (const definition of routeCatalog.definitions) {
        if (SKIPPED.has(definition.id)) continue;
        const route = routeFor(definition, fixture);
        const routePage = await context.newPage();
        const errors = new Set();
        routePage.on("pageerror", (error) =>
            errors.add(`PAGEERROR ${String(error.message).slice(0, 140)}`)
        );
        try {
            await routePage.goto(`/#${route}`);
            await routePage.locator("#topnav").waitFor({ timeout: 15000 });
            await routePage.waitForTimeout(2500);
        } catch (error) {
            errors.add(`NAVIGATION ${error.message.slice(0, 100)}`);
        }
        if (errors.size) {
            errorsByRoute[`${definition.id} ${route}`] = [...errors].sort();
        }
        await routePage.close();
    }

    expect(errorsByRoute).toEqual(KNOWN_ERRORS);
});
