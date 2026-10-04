// Arranges server-side state for a flow (an event, drivers, a chart) the same
// way the backend integration suite does, so the UI under test starts from a
// known situation instead of clicking through setup. The flows themselves
// still drive the real UI.

/** Reads the signed-in user's id token out of the page's stored oidc session. */
async function readIdToken(page) {
    const token = await page.evaluate(() => {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith("oidc.user:")) {
                return JSON.parse(localStorage.getItem(key)).id_token;
            }
        }
        return null;
    });
    if (!token) throw new Error("No signed-in session found in localStorage");
    return token;
}

function createApi(request, baseURL, idToken) {
    const headers = { Authorization: idToken };
    return {
        async post(endpoint, body) {
            const response = await request.post(`${baseURL}/app${endpoint}`, {
                headers,
                data: body,
            });
            if (!response.ok()) {
                throw new Error(
                    `POST ${endpoint} failed: ${response.status()} ${await response.text()}`
                );
            }
            return response.json();
        },
        async get(endpoint, params = {}) {
            const response = await request.get(`${baseURL}/app${endpoint}`, {
                headers,
                params: { ...params, cache: String(Date.now()) },
            });
            if (!response.ok()) {
                throw new Error(
                    `GET ${endpoint} failed: ${response.status()} ${await response.text()}`
                );
            }
            return response.json();
        },
    };
}

module.exports = { createApi, readIdToken };
