const fs = require("fs");
const path = require("path");

// The e2e flows need a real Cognito test user. Credentials come from
// E2E_TEST_USER / E2E_TEST_PASSWORD, falling back to the backend integration
// suite's ignored backend/test/.env.local (TEST_USER / TEST_PASSWORD), so the
// same dedicated test user serves both. Nothing here logs or returns them
// anywhere but the login form.
function readEnvFile(file) {
    const values = {};
    if (!fs.existsSync(file)) return values;
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
        const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
        if (match) values[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    }
    return values;
}

function loadCredentials() {
    const fileValues = readEnvFile(
        path.resolve(__dirname, "../../../backend/test/.env.local")
    );
    const username = process.env.E2E_TEST_USER || fileValues.TEST_USER;
    const password = process.env.E2E_TEST_PASSWORD || fileValues.TEST_PASSWORD;
    return username && password ? { username, password } : null;
}

module.exports = { loadCredentials };
