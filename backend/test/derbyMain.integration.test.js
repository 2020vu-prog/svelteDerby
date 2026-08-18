const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const { CF, getData, postData } = require("./common.js");
const { integrationTimestamp, orgId, orgIz } = require("./integrationRun.js");

function getTokenClaims() {
    const token = fs.readFileSync(path.resolve(__dirname, "token.txt"), "utf8");
    return jwt.decode(token);
}

const integrationGitBreadcrumb = JSON.parse(
    execFileSync(path.resolve(__dirname, "../scripts/gitBreadcrumb.sh"), {
        encoding: "utf8",
    })
);
let addEventConfigResult;

beforeAll(async () => {
    const received = await postData(`${CF}/addEventConfig`, {
        orgIz,
        orgId,
        lcl1: "true",
        name: `derbyMain integration ${integrationTimestamp}`,
    });

    expect(received.data.status).toMatch(/ok/i);
    addEventConfigResult = received.data;
});

test("getAwsConfig returns the hosted Cognito client config", async () => {
    const data = await getData(`${CF}/getAwsConfig`);
    const claims = getTokenClaims();

    expect(claims.aud).toBe(data.aws_user_pools_hosted_client_id);
    expect(claims.iss).toBe(
        `https://cognito-idp.${data.aws_cognito_region}.amazonaws.com/${data.aws_user_pools_id}`
    );
    expect(data).toEqual(
        expect.objectContaining({
            DeployEnvironment: expect.any(String),
            hosted_url: expect.stringMatching(/^https:\/\//),
            mqtt_ps_key: expect.any(String),
            mqtt_ps_url: expect.stringMatching(/^https:\/\//),
        })
    );
});

test("getDerbyMainVersion returns deployment metadata", async () => {
    const data = await getData(`${CF}/getDerbyMainVersion`);
    const breadcrumb = JSON.parse(data.gitBreadcrumb);

    expect(data.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(breadcrumb).toEqual(
        expect.objectContaining({
            buildTime: expect.anything(),
            hash: expect.any(String),
        })
    );
    expect(Number(breadcrumb.buildTime)).toBeGreaterThan(0);
});

test("iot discovery returns the timer backend configuration", async () => {
    const data = await getData(`${CF}/iot/discover`, {
        headers: { "x-rr1-timer": `integration-${orgId}` },
    });

    expect(data.priority).toBeDefined();
    expect(Array.isArray(data.backends)).toBe(true);
    expect(data.backends.length).toBeGreaterThan(0);
    expect(data.authUrl).toMatch(/^https:\/\//);
    expect(data.bundleUrl).toMatch(/^https:\/\//);
});

test("listOrgEvents returns event config for an org index", async () => {
    const data = await getData(`${CF}/listOrgEvents?orgIz=${orgIz}`);

    expect(data).toBeTruthy();
    expect(Array.isArray(data) || typeof data === "object").toBe(true);
});

test("addEventConfig refreshes user display names", async () => {
    expect(addEventConfigResult.userDisplayNameResult.status).toMatch(/ok/i);
    expect(
        addEventConfigResult.userDisplayNameResult.total
    ).toBeGreaterThanOrEqual(0);
    expect(
        addEventConfigResult.userDisplayNameResult.created
    ).toBeGreaterThanOrEqual(0);
});

test("addLogMessage records the integration test Git breadcrumb", async () => {
    const received = await postData(`${CF}/addLogMessage`, {
        orgIz,
        orgId,
        level: "info",
        source: "derbyMain.integration.test.js",
        message: `Integration test Git breadcrumb ${integrationGitBreadcrumb.hash}`,
        detail: { gitBreadcrumb: integrationGitBreadcrumb },
    });

    expect(received.data.status).toMatch(/ok/i);
    expect(received.data.entity.message).toContain(
        integrationGitBreadcrumb.hash
    );
    expect(received.data.entity.detail.gitBreadcrumb).toEqual(
        integrationGitBreadcrumb
    );
});

test("getOrgRoles returns roles for the authenticated user", async () => {
    const claims = getTokenClaims();
    const email = claims.email || claims["cognito:username"];
    const data = await getData(
        `${CF}/getOrgRoles?orgIz=${orgIz}&userEmail=${encodeURIComponent(email)}`
    );

    expect(data.email).toBe(email.toLowerCase());
    expect(Array.isArray(data.roleList)).toBe(true);
});

test("listOrgUser returns the organization permission records", async () => {
    const data = await getData(`${CF}/listOrgUser?orgIz=${orgIz}`);

    expect(Array.isArray(data)).toBe(true);
});

test("updateEventConfig updates the throwaway event config", async () => {
    const received = await postData(`${CF}/updateEventConfig`, {
        orgIz,
        orgId,
        lcl1: "false",
        name: `derbyMain integration updated ${integrationTimestamp}`,
        paUri: "",
        pendingRule: "integration",
    });

    expect(received.data.status).toMatch(/ok/i);
    expect(received.data.userDisplayNameResult.status).toMatch(/ok/i);
    expect(received.data.userDisplayNameResult.created).toBeGreaterThanOrEqual(
        1
    );
    expect(received.data.userDisplayNameResult.total).toBeGreaterThanOrEqual(1);
});

test("timer routes return active timer lists", async () => {
    const query = `orgIz=${orgIz}&orgId=${orgId}`;
    const [activeTimers, activePbTimers] = await Promise.all([
        getData(`${CF}/getActiveTimers?${query}`),
        getData(`${CF}/getActivePbTimers?${query}`),
    ]);

    expect(Array.isArray(activeTimers)).toBe(true);
    expect(Array.isArray(activePbTimers)).toBe(true);
    activeTimers.forEach((timer) => {
        expect(timer.uuid).toBeUndefined();
    });
});

test("getTimerHistory reports an event without an active assigned timer", async () => {
    const data = await getData(
        `${CF}/getTimerHistory?orgIz=${orgIz}&orgId=${orgId}`
    );

    expect(data.error).toMatch(/missing selectedTimerUuid/i);
});

test("getTimerPbHistory validates its required timer name", async () => {
    const data = await getData(
        `${CF}/getTimerPbHistory?orgIz=${orgIz}&orgId=${orgId}`
    );

    expect(data.error).toMatch(/missing timerName/i);
});

test("getPhaseElapsed returns no record for an unused phase key", async () => {
    const data = await getData(
        `${CF}/getPhaseElapsed?orgIz=${orgIz}&orgId=${orgId}&sk=integration-${uuidv4()}`
    );

    expect(data == null || Object.keys(data).length === 0).toBe(true);
});

test("listMediaPrefix returns no objects for an isolated prefix", async () => {
    const data = await getData(
        `${CF}/listMediaPrefix?orgIz=${orgIz}&orgId=${orgId}&prefix=integration-${uuidv4()}`
    );

    expect(data).toEqual([]);
});

test("requestServerEpochMS returns the current server time", async () => {
    const before = Date.now();
    const data = await getData(
        `${CF}/requestServerEpochMS?orgIz=${orgIz}&orgId=${orgId}`
    );
    const after = Date.now();

    expect(data.epochMS).toBeGreaterThanOrEqual(before - 5000);
    expect(data.epochMS).toBeLessThanOrEqual(after + 5000);
});

test("requestS3PutObjectUrl returns a signed upload URL", async () => {
    const data = await getData(
        `${CF}/requestS3PutObjectUrl?orgIz=${orgIz}&orgId=${orgId}&key=integration-test.webm`
    );

    expect(data.signedUrl).toMatch(/^https:\/\//);
    expect(data.issuedMs).toBeGreaterThan(0);
});

test("requestMqttSubPermission validates principal before policy attach", async () => {
    const data = await getData(
        `${CF}/requestMqttSubPermission?orgIz=${orgIz}&orgId=${orgId}`
    );

    expect(data.error).toMatch(/missing principal/i);
});
