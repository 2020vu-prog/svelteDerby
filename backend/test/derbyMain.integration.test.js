const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const { CF, getData, postData } = require("./common.js");

const devConfig = require(path.resolve(
    __dirname,
    process.env.TEST_AWS_EXPORTS_FILE || "./aws-exports.json"
));

function getTokenClaims() {
    const token = fs.readFileSync(path.resolve(__dirname, "token.txt"), "utf8");
    return jwt.decode(token);
}

const orgIz = "Test";
const orgId = `${orgIz}.${uuidv4().substring(0, 5)}`;
let addEventConfigResult;

beforeAll(async () => {
    const now = new Date().toISOString();
    const received = await postData(`${CF}/addEventConfig`, {
        orgIz,
        orgId,
        lcl1: "true",
        name: `derbyMain integration ${now}`,
    });

    expect(received.data.status).toMatch(/ok/i);
    addEventConfigResult = received.data;
});

test("getAwsConfig returns the hosted Cognito client config", async () => {
    const data = await getData(`${CF}/getAwsConfig`);

    expect(data.aws_cognito_region).toBe(devConfig.aws_cognito_region);
    expect(data.aws_user_pools_id).toBe(devConfig.aws_user_pools_id);
    expect(data.aws_user_pools_hosted_client_id).toBe(
        devConfig.aws_user_pools_hosted_client_id
    );
});

test("listOrgEvents returns event config for an org index", async () => {
    const data = await getData(`${CF}/listOrgEvents?orgIz=${orgIz}`);

    expect(data).toBeTruthy();
    expect(Array.isArray(data) || typeof data === "object").toBe(true);
});

test("addEventConfig refreshes user display names", async () => {
    expect(addEventConfigResult.userDisplayNameResult.status).toMatch(/ok/i);
    expect(addEventConfigResult.userDisplayNameResult.total).toBeGreaterThanOrEqual(0);
    expect(addEventConfigResult.userDisplayNameResult.created).toBeGreaterThanOrEqual(0);
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

test("updateEventConfig updates the throwaway event config", async () => {
    const received = await postData(`${CF}/updateEventConfig`, {
        orgIz,
        orgId,
        lcl1: "false",
        name: "derbyMain integration updated",
        paUri: "",
        pendingRule: "integration",
    });

    expect(received.data.status).toMatch(/ok/i);
    expect(received.data.userDisplayNameResult.status).toMatch(/ok/i);
    expect(received.data.userDisplayNameResult.created).toBeGreaterThanOrEqual(1);
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
