const { createApi, readIdToken } = require("./api");

const ORG_IZ = "Test";

/**
 * Waits until the event's history, which is what the app loads when an event
 * is opened, satisfies the predicate. New records reach it asynchronously
 * (DerbyMain stream -> dynamoMain Lambda, batched for up to 2 seconds ->
 * DerbyDist table), so data written a moment ago can be missing from the
 * first read. Waiting here, instead of retrying in the UI, keeps the flows
 * deterministic about what the app can see.
 */
async function waitForHistory(api, scope, description, predicate) {
    const deadline = Date.now() + 30000;
    let history = [];
    while (Date.now() < deadline) {
        history = await api.get("/getRaceHistory", scope);
        if (predicate(history)) return history;
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(
        `Timed out waiting for the event history to contain ${description}`
    );
}

function expectOk(result, what) {
    if (!result || !/ok/i.test(result.status || "")) {
        throw new Error(`${what} failed: ${JSON.stringify(result)}`);
    }
    return result;
}

/**
 * Creates a throwaway event under the Test org with drivers 100, 109 and 333,
 * and (optionally) a bracket chart whose heat 01 has cars 100 and 109 in it,
 * which makes the backend create the pending race for that heat. Every call
 * uses a fresh orgId, so specs can run in parallel without sharing state.
 */
async function createEventFixture(page, request, { chart = false } = {}) {
    const api = createApi(
        request,
        new URL(page.url()).origin,
        await readIdToken(page)
    );
    const runId = Math.random().toString(36).slice(2, 7);
    const orgId = `${ORG_IZ}.e2e${runId}`;
    const eventName = `e2e event ${runId}`;
    const scope = { orgIz: ORG_IZ, orgId };

    expectOk(
        await api.post("/addEventConfig", {
            ...scope,
            lcl1: "true",
            name: eventName,
        }),
        "addEventConfig"
    );
    const drivers = { 100: "Alpha 100", 109: "Bravo 109", 333: "Charlie 333" };
    for (const [number, name] of Object.entries(drivers)) {
        expectOk(
            await api.post("/addParticipant", { ...scope, number, name }),
            `addParticipant ${number}`
        );
    }

    let chartId;
    const chartName = `e2e chart ${runId}`;
    if (chart) {
        const added = expectOk(
            await api.post("/addChart", {
                ...scope,
                bracketName: chartName,
                imgPath: "AASBD/Single/06single.png",
                jsonPath: "AASBD/Single/06single.combined.json",
            }),
            "addChart"
        );
        chartId = added.chartId;
        for (const [letter, ptcp] of [
            ["A", "100"],
            ["B", "109"],
        ]) {
            expectOk(
                await api.post("/addChartPosition", {
                    ...scope,
                    chartId,
                    heatNumber: "01",
                    pos: { [letter]: { ptcp, status: "ptcp" } },
                }),
                `addChartPosition ${letter}`
            );
        }
    }
    const isDriver = (entity) => /:PTCP$/.test(entity.PK || "");
    await waitForHistory(
        api,
        scope,
        "the three drivers",
        (history) => history.filter(isDriver).length === 3
    );
    if (chart) {
        // the pending race for heat 01, made by the backend from the chart
        await waitForHistory(
            api,
            scope,
            "the pending race for chart heat 01",
            (history) =>
                history.some(
                    (entity) =>
                        entity.SK === `${chartId}:01` &&
                        entity.Bp === `${chartId}:01`
                )
        );
    }
    return {
        api,
        ...scope,
        eventName,
        drivers,
        chartId,
        chartName,
        waitForHistory: (description, predicate) =>
            waitForHistory(api, scope, description, predicate),
    };
}

module.exports = { createEventFixture, ORG_IZ };
