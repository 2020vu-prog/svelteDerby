const ApiRouter = require("../modules/lambdaDerby/src/ApiRouter.js");
const RoutePermission = require(
    "../modules/lambdaDerby/src/RoutePermission.js"
);

const CAN_EXAMPLE = new RoutePermission("CanExample");
const CAN_PLUGIN = new RoutePermission("CanPlugin");
const CAN_PROTECTED = new RoutePermission("CanProtected");

function buildRouter(overrides = {}) {
    const dependencies = {
        pathPrefix: "/app",
        authenticate: jest.fn(async () => ({ email: "user@example.com" })),
        authorize: jest.fn(async () => true),
        loadContext: jest.fn(async () => ({
            orgId: "Test.123",
            orgIz: "Test",
            defaultTTL: 123,
            config: {},
            roleList: ["registration"],
        })),
        buildResponse: jest.fn((body) => body),
        isFrozen: jest.fn(() => false),
        log: { debug: jest.fn() },
        ...overrides,
    };
    return { dependencies, router: new ApiRouter(dependencies) };
}

test("registers and dispatches a route with its declared permission", async () => {
    const { dependencies, router } = buildRouter();
    const handler = jest.fn(async (_event, context) => context.permission);
    router.register("/example", {
        permission: CAN_EXAMPLE,
        handler,
    });

    const result = await router.dispatch({ path: "/app/example" });

    expect(result).toBe("CanExample");
    expect(dependencies.authorize).toHaveBeenCalledWith(
        "CanExample",
        expect.objectContaining({ orgId: "Test.123" }),
        expect.objectContaining({ email: "user@example.com" })
    );
    expect(dependencies.log.debug).toHaveBeenCalledWith(
        "route handling: /example permission: CanExample"
    );
});

test("supports plugins that register routes dynamically", () => {
    const { router } = buildRouter();
    router.use((pluginRouter) => {
        pluginRouter.register("/plugin", {
            permission: CAN_PLUGIN,
            handler: async () => "ok",
        });
    });

    expect(router.list()).toEqual([
        { path: "/plugin", permission: "CanPlugin", public: false },
    ]);
});

test("requires every route to declare a permission", () => {
    const { router } = buildRouter();
    expect(() => router.register("/missing", { handler: async () => {} }))
        .toThrow("Route /missing requires a permission");
});

test("requires enum-like RoutePermission values instead of raw strings", () => {
    const { router } = buildRouter();
    expect(() => router.register("/string", {
        permission: "CanExample",
        handler: async () => {},
    })).toThrow("Route permission must be a RoutePermission");
    expect(String(CAN_EXAMPLE)).toBe("CanExample");
    expect(JSON.stringify(CAN_EXAMPLE)).toBe('"CanExample"');
});

test("rejects unauthorized requests before dispatch", async () => {
    const { router } = buildRouter({ authorize: jest.fn(async () => false) });
    const handler = jest.fn();
    router.register("/protected", {
        permission: CAN_PROTECTED,
        handler,
    });

    await expect(router.dispatch({ path: "/app/protected" })).resolves.toEqual({
        error: "unauthorized",
        statusCode: 401,
    });
    expect(handler).not.toHaveBeenCalled();
});

test("public context-free routes skip authentication and authorization", async () => {
    const { dependencies, router } = buildRouter();
    router.register("/public", {
        permission: RoutePermission.PUBLIC,
        loadContext: false,
        handler: async () => "public result",
    });

    await expect(router.dispatch({ path: "/app/public" }))
        .resolves.toBe("public result");
    expect(dependencies.authenticate).not.toHaveBeenCalled();
    expect(dependencies.authorize).not.toHaveBeenCalled();
    expect(dependencies.loadContext).not.toHaveBeenCalled();
});

test("enforces context and frozen-event policies", async () => {
    const { router } = buildRouter({
        loadContext: jest.fn(async () => ({ orgIz: "Test", config: {} })),
    });
    router.register("/missing-org", {
        permission: CAN_EXAMPLE,
        handler: async () => "unexpected",
    });
    await expect(router.dispatch({ path: "/app/missing-org" })).resolves.toEqual({
        error: "Unable to determine orgId",
    });

    const frozen = buildRouter({ isFrozen: jest.fn(() => true) }).router;
    frozen.register("/frozen", {
        permission: CAN_EXAMPLE,
        handler: async () => "unexpected",
    });
    await expect(frozen.dispatch({ path: "/app/frozen" })).resolves.toEqual({
        error: "Can't edit a frozen/archived race",
    });
});

test("rejects duplicate route registrations", () => {
    const { router } = buildRouter();
    const definition = { permission: CAN_EXAMPLE, handler: async () => {} };
    router.register("/duplicate", definition);
    expect(() => router.register("/duplicate", definition))
        .toThrow("Route /duplicate is already registered");
});
