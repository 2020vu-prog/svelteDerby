// The service loads loglevel from the lambda's own node_modules, so spy on that copy.
const log = require(
    require.resolve("loglevel", {
        paths: [require.resolve("../modules/lambdaDerby/src/response.js")],
    })
);
const {
    createResponseHelpers,
} = require("../modules/lambdaDerby/src/response.js");

const NOW = 1700000000000;
let savedEnvironment;

beforeEach(() => {
    savedEnvironment = process.env.DeployEnvironment;
    process.env.DeployEnvironment = "test";
    jest.spyOn(Date, "now").mockReturnValue(NOW);
    jest.spyOn(log, "error").mockImplementation(() => {});
    jest.spyOn(log, "warn").mockImplementation(() => {});
});
afterEach(() => {
    jest.restoreAllMocks();
    if (savedEnvironment === undefined) delete process.env.DeployEnvironment;
    else process.env.DeployEnvironment = savedEnvironment;
});

function build(parameterValue = "x") {
    const ssmClient = {
        send: jest.fn(async () => ({ Parameter: { Value: parameterValue } })),
    };
    const helpers = createResponseHelpers({
        ssmClient,
        clientMinimumVersion: "1.2.3",
        derbyMainVersion: "9.9.9",
    });
    return { ...helpers, ssmClient };
}

describe("buildResponse", () => {
    test("wraps a body in a json response carrying both versions", () => {
        const { buildResponse } = build();

        expect(buildResponse({ a: 1 })).toEqual({
            statusCode: 200,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "no-cache",
                "x-client-minimum": "1.2.3",
                "x-derby-main-version": "9.9.9",
            },
            body: '{"a":1}',
        });
    });

    test("takes its status from the body and an optional cache-control", () => {
        const { buildResponse } = build();

        const response = buildResponse(
            { statusCode: 404, error: "nope" },
            "max-age=120"
        );

        expect(response.statusCode).toBe(404);
        expect(response.headers["Cache-Control"]).toBe("max-age=120");
        expect(response.body).toBe('{"statusCode":404,"error":"nope"}');
    });

    test.each([[undefined], [null], [false], [0]])(
        "a falsy body (%s) becomes an empty object",
        (body) => {
            const { buildResponse } = build();

            const response = buildResponse(body);

            expect(response.statusCode).toBe(200);
            expect(response.body).toBe("{}");
        }
    );

    test("is safe to pass around unbound", () => {
        const { buildResponse } = build();
        const detached = [{ x: 1 }].map(buildResponse);

        expect(detached[0].statusCode).toBe(200);
    });
});

describe("getDerbyMainVersionInfo", () => {
    const breadcrumb = (buildTime) => JSON.stringify({ buildTime, sha: "abc" });

    test("reads the deploy breadcrumb for this environment", async () => {
        const { getDerbyMainVersionInfo, ssmClient } = build("main@abc");

        await expect(getDerbyMainVersionInfo()).resolves.toEqual({
            version: "9.9.9",
            gitBreadcrumb: "main@abc",
        });
        expect(ssmClient.send.mock.calls[0][0].input).toEqual({
            Name: "/deploy/test/git-breadcrumb",
        });
        expect(log.warn).toHaveBeenCalledWith(
            "Unable to parse git breadcrumb buildTime"
        );
    });

    test.each([
        ["just built", NOW - 1000, true],
        ["exactly at build time", NOW, true],
        ["exactly ten minutes after", NOW - 600000, true],
        ["more than ten minutes after", NOW - 600001, false],
        ["before the build time", NOW + 1, false],
    ])(
        "logs the cloudwatch monitor test error when %s",
        async (label, buildTime, logged) => {
            const { getDerbyMainVersionInfo } = build(
                breadcrumb(String(buildTime))
            );

            await getDerbyMainVersionInfo();

            expect(log.error).toHaveBeenCalledTimes(logged ? 1 : 0);
            if (logged) {
                expect(log.error).toHaveBeenCalledWith(
                    "ERROR CloudWatch monitor test from getDerbyMainVersionInfo"
                );
            }
            expect(log.warn).not.toHaveBeenCalled();
        }
    );

    test.each([["not json"], [JSON.stringify({})], ["null"]])(
        "an unusable breadcrumb (%s) is still returned, with a warning",
        async (value) => {
            const { getDerbyMainVersionInfo } = build(value);

            await expect(getDerbyMainVersionInfo()).resolves.toEqual({
                version: "9.9.9",
                gitBreadcrumb: value,
            });
            expect(log.error).not.toHaveBeenCalled();
        }
    );

    test("lets an ssm failure reach the caller", async () => {
        const { getDerbyMainVersionInfo, ssmClient } = build();
        ssmClient.send.mockRejectedValue(new Error("ssm down"));

        await expect(getDerbyMainVersionInfo()).rejects.toThrow("ssm down");
    });
});
