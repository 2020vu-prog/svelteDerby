// @ts-check
const { defineConfig, devices } = require("@playwright/test");

// The app is a Cognito-gated SPA behind an AWS-proxied dev server (see
// devServer.proxy in webpack.config.common.js) -- there's no secret-free way
// to boot it locally, so these tests target a real deployed environment
// rather than an auto-started local server. Point PLAYWRIGHT_BASE_URL at
// whichever environment you're soaking (test.rr1.us / stage.rr1.us), per
// Phase 0 in docs/SvelteUpgradeProposal.md.
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "https://test.rr1.us";

module.exports = defineConfig({
    testDir: "./e2e",
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
            use: { ...devices["Desktop Chrome"] },
        },
    ],
});
