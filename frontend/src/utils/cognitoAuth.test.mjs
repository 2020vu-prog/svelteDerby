import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { afterEach, beforeEach } from "node:test";

const source = readFileSync(
    new URL("./cognitoAuth.js", import.meta.url),
    "utf8"
).replace(
    'import { UserManager, WebStorageStateStore } from "oidc-client-ts";',
    "const UserManager = class {}; const WebStorageStateStore = class {};"
);
const auth = await import(
    `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);

const originalHistory = globalThis.history;
const originalDocument = globalThis.document;

beforeEach(() => {
    globalThis.document = { title: "Derby" };
    globalThis.history = { replaceState: () => {} };
});

afterEach(() => {
    globalThis.history = originalHistory;
    globalThis.document = originalDocument;
});

test("recognizes Cognito callbacks without consuming Spotify callbacks", () => {
    assert.equal(
        auth.isCognitoCallback(
            "https://app.example.com/?code=code&state=random%3Bcognito"
        ),
        true
    );
    assert.equal(
        auth.isCognitoCallback(
            "https://app.example.com/?code=code&state=spotify_auth_callback"
        ),
        false
    );
});

test("completes a Cognito callback and removes its query parameters", async () => {
    const user = { id_token: "id-token" };
    let callbackUrl;
    let cleanedUrl;
    globalThis.history.replaceState = (_state, _title, url) => {
        cleanedUrl = url;
    };
    const manager = {
        signinRedirectCallback: async (url) => {
            callbackUrl = url;
            return user;
        },
    };
    const url =
        "https://app.example.com/?code=code&state=random%3Bcognito&keep=yes#/route";

    assert.equal(await auth.completeCognitoLogin(manager, url), user);
    assert.equal(callbackUrl, url);
    assert.equal(cleanedUrl, "https://app.example.com/?keep=yes#/route");
});

test("renews an expiring user with the library refresh flow", async () => {
    const renewed = { id_token: "new", expires_in: 3600 };
    let renewCount = 0;
    const manager = {
        getUser: async () => ({ id_token: "old", expires_in: 30 }),
        signinSilent: async () => {
            renewCount += 1;
            return renewed;
        },
    };

    assert.equal(await auth.freshCognitoUser(manager), renewed);
    assert.equal(renewCount, 1);
});

test("revokes and removes the library-managed user", async () => {
    const calls = [];
    const manager = {
        revokeTokens: async (types) => calls.push(["revoke", types]),
        removeUser: async () => calls.push(["remove"]),
    };

    await auth.removeCognitoUser(manager);
    assert.deepEqual(calls, [["revoke", ["refresh_token"]], ["remove"]]);
});
