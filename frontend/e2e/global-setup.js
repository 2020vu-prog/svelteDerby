const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");
const { loadCredentials } = require("./support/credentials");
const { signIn } = require("./support/login");

const stateFile = path.resolve(__dirname, ".auth/state.json");

// Signs in once, through the real hosted login page, and saves the browser
// state so every logged-in spec starts already authenticated. Without test
// credentials it saves an empty state and those specs skip themselves.
module.exports = async (config) => {
    fs.rmSync(stateFile, { force: true });
    fs.mkdirSync(path.dirname(stateFile), { recursive: true });
    const credentials = loadCredentials();
    if (!credentials) {
        // An empty signed-out state, so the configured path always exists.
        fs.writeFileSync(
            stateFile,
            JSON.stringify({ cookies: [], origins: [] })
        );
        return;
    }

    const baseURL = config.projects[0].use.baseURL;
    const browser = await chromium.launch();
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    await signIn(page, credentials);
    await context.storageState({ path: stateFile });
    await browser.close();
};
module.exports.stateFile = stateFile;
