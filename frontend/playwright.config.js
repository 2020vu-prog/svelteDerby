// @ts-check
const { defineConfig, devices } = require("@playwright/test");

// The app is a Cognito-gated SPA behind an AWS-proxied dev server (see
// devServer.proxy in webpack.config.common.js) -- there's no secret-free way
// to boot it locally, so these tests target a real deployed environment
// rather than an auto-started local server. Point PLAYWRIGHT_BASE_URL at
// whichever environment you're soaking (test.rr1.us / stage.rr1.us), per
// Phase 0 in docs/TODO/SvelteUpgradeProposal.md.
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "https://test.rr1.us";

const globalSetup = require.resolve("./e2e/global-setup.js");
const { stateFile } = require("./e2e/global-setup.js");

module.exports = defineConfig({
    testDir: "./e2e",
    // Signs in once through the real hosted login page and saves the session
    // for the logged-in flows (see e2e/global-setup.js). Needs test
    // credentials (E2E_TEST_USER / E2E_TEST_PASSWORD, or backend/test/.env.local).
    globalSetup,
    // These run against a live deployed environment, where a flow with several
    // page loads and backend round trips needs more than the 30s default.
    timeout: 90000,
    expect: { timeout: 10000 },
    workers: process.env.CI ? 2 : 3,
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: "list",
    use: {
        baseURL,
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "chromium",
            use: {
                ...devices["Desktop Chrome"],
                // Always this path: global setup writes the signed-in state
                // there, or an empty one without credentials (the logged-in
                // specs then skip themselves). Not decided here by whether
                // the file exists, because this config is read before
                // global setup runs.
                storageState: stateFile,
            },
        },
    ],
});
