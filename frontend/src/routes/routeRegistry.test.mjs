import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { RoutePermission } = require("./routePermission.js");
const RoleName = require("../../../backend/modules/lambdaDerby/src/shared/RoleName.js");
const routeRegistry = require("./routeCatalog.js");
const { canAccessRoute } = require("./routeAccess.js");
const {
    createRouteRegistry,
    decodeRouteParams,
    getMenuItems,
    getRequiredPermission,
    isRecognizedDeepLink,
    resolveRouteAction,
} = require("./routeRegistry.js");
const { MenuSection } = require("./routeDefinitions.js");
const {
    permissionMap2,
} = require("../../../backend/modules/lambdaDerby/src/shared/permissionLits.js");

/**
 * Creates representative route-resolution state for registry unit tests.
 *
 * @param {string[]} [roleList]
 * @param {object} [overrides]
 * @returns {import("./routeRegistry.js").RouteContext}
 */
function context(roleList = [], overrides = {}) {
    return {
        raceConfig: { orgId: "Test", orgIz: "TestOrg" },
        roleMap: { "user@example.com": { TestOrg: roleList } },
        userEmail: "user@example.com",
        userId: "TestUser",
        ...overrides,
    };
}

test("validates unique route ids and paths", () => {
    assert.throws(
        () =>
            createRouteRegistry([
                {
                    id: "same",
                    path: "/one",
                    permission: RoutePermission.PUBLIC,
                },
                {
                    id: "same",
                    path: "/two",
                    permission: RoutePermission.PUBLIC,
                },
            ]),
        /Duplicate route id/
    );
    assert.throws(
        () =>
            createRouteRegistry([
                {
                    id: "one",
                    path: "/same",
                    permission: RoutePermission.PUBLIC,
                },
                {
                    id: "two",
                    path: "/same",
                    permission: RoutePermission.PUBLIC,
                },
            ]),
        /Duplicate route path/
    );
});

test("requires every route to declare its access level", () => {
    assert.throws(
        () => createRouteRegistry([{ id: "missing", path: "/missing" }]),
        /must specify a permission/
    );
});

test("requires shared RoutePermission values instead of raw strings", () => {
    assert.throws(
        () =>
            createRouteRegistry([
                { id: "raw", path: "/raw", permission: "Anonymous" },
            ]),
        /must be a RoutePermission/
    );
});

test("frontend permission names remain backed by role permissions", () => {
    for (const permission of Object.values(RoutePermission).filter(
        (value) => value !== RoutePermission.PUBLIC
    )) {
        assert.ok(
            permissionMap2[permission.toString()],
            `Unknown permission: ${permission}`
        );
    }
});

test("matches parameterized and optional routes", () => {
    assert.deepEqual(routeRegistry.match("/drivers").params, {
        selectable: null,
    });
    assert.deepEqual(routeRegistry.match("/drivers/true").params, {
        selectable: "true",
    });
    assert.deepEqual(routeRegistry.match("/eventAdd/Test%20Org/Add").params, {
        orgIz: "Test Org",
        mode: "Add",
    });
});

test("decodes component route parameters at the router boundary", () => {
    assert.deepEqual(
        decodeRouteParams({
            orgIz: "IL%3ACHI2",
            label: "Race%20Day",
            optional: null,
            malformed: "%E0%A4%A",
        }),
        {
            orgIz: "IL:CHI2",
            label: "Race Day",
            optional: null,
            malformed: "%E0%A4%A",
        }
    );
});

test("preserves recognized non-root routes during cold startup", () => {
    assert.equal(isRecognizedDeepLink(routeRegistry, "/"), false);
    assert.equal(isRecognizedDeepLink(routeRegistry, "/not-a-route"), false);
    assert.equal(
        isRecognizedDeepLink(
            routeRegistry,
            "/driverDelegate/IL%3ACHI2/IL%3ACHI2.99bf5/token"
        ),
        true
    );
    assert.equal(
        isRecognizedDeepLink(routeRegistry, "/as/IL%3ACHI2/Event.1"),
        true
    );
    assert.equal(isRecognizedDeepLink(routeRegistry, "/loginH"), true);
});

test("resolves parameter-specific route permission", () => {
    assert.equal(
        getRequiredPermission(
            routeRegistry.match("/raceStandingAdd/RacePhase")
        ),
        RoutePermission.CAN_ADD_BLOCKS
    );
    assert.equal(
        getRequiredPermission(
            routeRegistry.match("/raceStandingAdd/RaceStanding")
        ),
        RoutePermission.CAN_ADD_PENDING
    );
});

test("route access follows named role permissions", () => {
    const paInfo = routeRegistry.match("/pa_info");
    assert.equal(canAccessRoute(paInfo, context([RoleName.ANNOUNCER])), true);
    assert.equal(canAccessRoute(paInfo, context([])), false);
    assert.equal(
        canAccessRoute(
            routeRegistry.match("/driverAdd"),
            context([RoleName.ANNOUNCER])
        ),
        false
    );
    assert.equal(
        canAccessRoute(
            routeRegistry.match("/driverAdd"),
            context([RoleName.REGISTRATION])
        ),
        true
    );
});

test("anonymous users only receive general event menus", () => {
    const items = getMenuItems(
        routeRegistry,
        MenuSection.GENERAL,
        context([]),
        canAccessRoute
    );
    assert.deepEqual(
        items.map((item) => item.text),
        [
            "Drivers",
            "Phase History",
            "Race History",
            "Pending Races",
            "Charts",
            "Watch Different Event",
            "My Drivers",
            "Preferences & Sharing",
            "Logout [user@example.com]",
        ]
    );
});

test("admin menus are derived from route permission", () => {
    const announcerItems = getMenuItems(
        routeRegistry,
        MenuSection.ADMIN,
        context([RoleName.ANNOUNCER]),
        canAccessRoute
    );
    assert.deepEqual(
        announcerItems.map((item) => item.text),
        ["Manual Announcement", "PA Info"]
    );

    const timerItems = getMenuItems(
        routeRegistry,
        MenuSection.ADMIN,
        context([RoleName.POWER]),
        canAccessRoute
    );
    assert.deepEqual(
        timerItems.map((item) => item.text),
        [
            "Timer Config",
            "Timer Columns",
            "List All Media",
            "Org Users",
            "Manual Announcement",
            "PA Info",
            "Capture Video",
            "Log Messages",
        ]
    );
});

test("page actions resolve targets and inherit target permission", () => {
    const driverAction = resolveRouteAction(
        routeRegistry.match("/drivers"),
        context([RoleName.REGISTRATION])
    );
    assert.equal(driverAction.target, "/driverAdd");
    assert.equal(
        canAccessRoute(routeRegistry.match(driverAction.target), context([])),
        false
    );
    assert.equal(
        canAccessRoute(
            routeRegistry.match(driverAction.target),
            context([RoleName.REGISTRATION])
        ),
        true
    );
    assert.equal(
        resolveRouteAction(routeRegistry.match("/drivers/true"), context()),
        null
    );
});

test("event add action checks roles for the selected organization", () => {
    const selectedOrgContext = context([], {
        roleMap: {
            "user@example.com": { OtherOrg: [RoleName.POWER] },
        },
    });
    const action = resolveRouteAction(
        routeRegistry.match("/eventSelection/OtherOrg"),
        selectedOrgContext
    );
    assert.equal(action.target, "/eventAdd/OtherOrg/Add");
    assert.equal(action.orgIz, "OtherOrg");
    assert.equal(
        canAccessRoute(routeRegistry.match(action.target), {
            ...selectedOrgContext,
            orgIz: action.orgIz,
        }),
        true
    );
});

test("direct event routes check the organization in the route", () => {
    const routeContext = context([RoleName.POWER], {
        roleMap: {
            "user@example.com": {
                OtherOrg: [RoleName.POWER],
                TestOrg: [],
            },
        },
    });
    assert.equal(
        canAccessRoute(
            routeRegistry.match("/eventAdd/OtherOrg/Add"),
            routeContext
        ),
        true
    );
    assert.equal(
        canAccessRoute(
            routeRegistry.match("/eventAdd/TestOrg/Add"),
            routeContext
        ),
        false
    );
});
