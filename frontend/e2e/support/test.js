const base = require("@playwright/test");

// The app's API GETs carry a `cache` query parameter that is empty unless the
// operator has asked for fresh data, so a just-created event or chart can be
// served stale from the CDN for a while. The flows create their own data
// moments before looking for it, so every API GET gets a unique `cache` value,
// which is what the app itself does when its cache is disabled.
const test = base.test.extend({
    page: async ({ page }, use) => {
        await page.route(/\/app\/[A-Za-z]+(\?|$)/, (route) => {
            const request = route.request();
            if (request.method() !== "GET") return route.continue();
            const url = new URL(request.url());
            if (url.searchParams.has("cache")) {
                url.searchParams.set("cache", `e2e${Date.now()}`);
                return route.continue({ url: url.toString() });
            }
            return route.continue();
        });
        await use(page);
    },
});

module.exports = { test, expect: base.expect };
