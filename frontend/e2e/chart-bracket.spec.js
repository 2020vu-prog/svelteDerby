const { test, expect } = require("./support/test");
const { loadCredentials } = require("./support/credentials");
const { createEventFixture } = require("./support/fixture");
const { openTab, selectEvent } = require("./support/ui");

// Flow 3: charts. An operator opens a bracket chart, sees who is in each heat,
// and after a heat finishes the winner and loser appear in their next heats.
test.skip(
    !loadCredentials(),
    "needs test credentials (see e2e/support/credentials.js)"
);

/** Runs both phases of chart heat 01 through the API, as the backend suite does. */
async function finishHeatOne(api, fixture) {
    const scope = { orgIz: fixture.orgIz, orgId: fixture.orgId };
    const nextOnBlocks = async () =>
        (await api.get("/getNextOnBlocks", scope))[0];
    for (const [cars, phr] of [
        [
            ["100", "109"],
            [0, 33000],
        ],
        [
            ["109", "100"],
            [44000, 0],
        ],
    ]) {
        const added = await api.post("/addBlocks", {
            ...scope,
            pt: "R",
            cn: cars,
        });
        expect(added.status).toMatch(/ok/i);
        const applied = await api.post("/doApplyFinishTime", {
            ...scope,
            SK: (await nextOnBlocks()).SK,
            phr,
        });
        expect(applied.status).toMatch(/ok/i);
    }
}

test.describe("bracket charts", () => {
    test("a chart is listed, and opening it shows the racers placed in heat 1", async ({
        page,
        request,
    }) => {
        await page.goto("/");
        const fixture = await createEventFixture(page, request, {
            chart: true,
        });
        await selectEvent(page, fixture.eventName);

        await openTab(page, "Charts");
        await page.getByText(fixture.chartName).first().click();

        await expect(page).toHaveURL(/#\/chartDetail\//i);
        await expect(
            page.getByText(`Chart Name: ${fixture.chartName}`)
        ).toBeVisible();
        await expect(page.getByText("01A - 100 Alpha 100")).toBeVisible();
        await expect(page.getByText("01B - 109 Bravo 109")).toBeVisible();
        // later heats are still waiting on results
        await expect(page.getByText("03A - W [Left1]Heat[01]")).toBeVisible();
        await expect(page.getByText("07A - L [Left1]Heat[01]")).toBeVisible();
    });

    test("when heat 1 finishes the winner moves to heat 3 and the loser to heat 7", async ({
        page,
        request,
    }) => {
        await page.goto("/");
        const fixture = await createEventFixture(page, request, {
            chart: true,
        });
        await finishHeatOne(fixture.api, fixture);
        // the advanced positions have to be readable before the app opens
        await fixture.waitForHistory(
            "car 100 in heat 3 and car 109 in heat 7",
            (history) => {
                const position = (heat, letter) =>
                    history.find(
                        (entity) =>
                            entity.SK === `${fixture.chartId}:${heat}` &&
                            /:Bp$/.test(entity.PK || "")
                    )?.pos?.[letter]?.ptcp;
                return (
                    position("03", "A") === "100" &&
                    position("07", "A") === "109"
                );
            }
        );
        await selectEvent(page, fixture.eventName);

        await openTab(page, "Charts");
        await page.getByText(fixture.chartName).first().click();

        // car 100 won both phases, so it takes heat 3; 109 drops to heat 7
        await expect(page.getByText("03A - 100 Alpha 100")).toBeVisible({
            timeout: 20000,
        });
        await expect(page.getByText("07A - 109 Bravo 109")).toBeVisible();
        await expect(page.getByText("03A - W [Left1]Heat[01]")).toHaveCount(0);
    });

    test("opening a heat from the pending list jumps to its place on the chart", async ({
        page,
        request,
    }) => {
        await page.goto("/");
        const fixture = await createEventFixture(page, request, {
            chart: true,
        });
        await selectEvent(page, fixture.eventName);

        await openTab(page, "Pending");
        await page.getByText("Heat: 01").click();

        await expect(page).toHaveURL(/#\/chartDetail\/.+scrollTo=01/i);
        await expect(page.getByText("01A - 100 Alpha 100")).toBeVisible();
    });
});
