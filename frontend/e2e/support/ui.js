const { expect } = require("@playwright/test");
const { ORG_IZ } = require("./fixture");

/** Opens the organization's event list and waits for the event to be in it. */
async function openEventList(page, eventName) {
    await page.goto(`/#/eventSelection/${ORG_IZ}`);
    const eventLink = page.getByText(eventName).first();
    await expect(eventLink).toBeVisible();
    return eventLink;
}

/** Picks the event from the organization's event list, as an operator would. */
async function selectEvent(page, eventName) {
    const eventLink = await openEventList(page, eventName);
    await eventLink.click();
    await page.waitForURL(/#\/RpList/);
    await expect(page.locator("#topnav")).toContainText(eventName);
}

/** Opens one of the bottom-nav tabs: Phases, Races, Pending or Charts. */
async function openTab(page, name) {
    await page.getByText(name, { exact: true }).last().click();
}

/** Types into a field key by key; the Add Blocks form only reacts to key events. */
async function typeInto(locator, text) {
    await locator.click();
    await locator.pressSequentially(text);
}

/**
 * Enters cars on the Add Blocks form and submits, then opens the phase list.
 * The form returns to whichever page opened it, so the list is opened explicitly.
 */
async function addBlocks(page, lane1Car, lane2Car) {
    await page.goto("/#/raceStandingAdd/RacePhase");
    await typeInto(page.locator("#cn1"), lane1Car);
    await typeInto(page.locator("#cn2"), lane2Car);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.waitForURL((url) => !url.hash.includes("raceStandingAdd"));
    await page.goto("/#/RpList");
}

module.exports = {
    addBlocks,
    openEventList,
    openTab,
    selectEvent,
    typeInto,
};
