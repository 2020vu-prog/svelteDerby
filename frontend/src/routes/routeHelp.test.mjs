import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readdirSync } from "node:fs";
import test from "node:test";

const require = createRequire(import.meta.url);
const RoleName = require("../../../backend/modules/lambdaDerby/src/shared/RoleName.js");
const { RoutePermission } = require("./routePermission.js");
const {
    createHelpCatalog,
    getVisibleHelpDescriptors,
    parseHelpFileKey,
    resolveRouteHelpIds,
} = require("./routeHelp.js");
const { createRouteHelpMarkdownRenderer } = require("./routeHelpMarkdown.js");
const { routeDefinitions } = require("./routeDefinitions.js");

function context(roleList = [], userEmail = "user@example.com") {
    return {
        raceConfig: { orgIz: "TestOrg" },
        roleMap: userEmail ? { [userEmail]: { TestOrg: roleList } } : {},
        userEmail,
    };
}

const keys = [
    "./RacePhaseList.help.MANUAL_FINISH_TIME.md",
    "./RacePhaseList.help.md",
    "./DriverList.help.md",
    "./DriverList.Selection.help.md",
];

test("parses public and permission-specific help filenames", () => {
    assert.deepEqual(parseHelpFileKey("./RacePhaseList.help.md"), {
        key: "./RacePhaseList.help.md",
        helpId: "RacePhaseList",
        permissionKey: null,
        permission: null,
    });

    const restricted = parseHelpFileKey(
        "./RacePhaseList.help.MANUAL_FINISH_TIME.md"
    );
    assert.equal(restricted.helpId, "RacePhaseList");
    assert.equal(restricted.permissionKey, "MANUAL_FINISH_TIME");
    assert.equal(restricted.permission, RoutePermission.MANUAL_FINISH_TIME);

    assert.equal(
        parseHelpFileKey("./DriverList.Selection.help.md").helpId,
        "DriverList.Selection"
    );
});

test("rejects malformed filenames and unknown permissions", () => {
    assert.throws(
        () => parseHelpFileKey("./RacePhaseList.md"),
        /Invalid route help filename/
    );
    assert.throws(
        () => parseHelpFileKey("./RacePhaseList.help.NOT_A_PERMISSION.md"),
        /Unknown RoutePermission key/
    );
    assert.throws(
        () => parseHelpFileKey("./RacePhaseList.help.PUBLIC.md"),
        /must use the base help filename/
    );
});

test("always exposes public help while filtering restricted help", () => {
    const catalog = createHelpCatalog(keys);

    assert.deepEqual(
        getVisibleHelpDescriptors(
            catalog,
            "RacePhaseList",
            context([], "")
        ).map((descriptor) => descriptor.key),
        ["./RacePhaseList.help.md"]
    );

    assert.deepEqual(
        getVisibleHelpDescriptors(
            catalog,
            "RacePhaseList",
            context([RoleName.POWER])
        ).map((descriptor) => descriptor.key),
        [
            "./RacePhaseList.help.md",
            "./RacePhaseList.help.MANUAL_FINISH_TIME.md",
        ]
    );
});

test("recomputing after logout removes restricted help", () => {
    const catalog = createHelpCatalog(keys);
    const loggedIn = getVisibleHelpDescriptors(
        catalog,
        "RacePhaseList",
        context([RoleName.POWER])
    );
    const loggedOut = getVisibleHelpDescriptors(
        catalog,
        "RacePhaseList",
        context([], "")
    );

    assert.equal(loggedIn.length, 2);
    assert.equal(loggedOut.length, 1);
});

test("returns no launcher content for a component without help", () => {
    assert.deepEqual(
        getVisibleHelpDescriptors(
            createHelpCatalog(keys),
            "ForceLoad",
            context([RoleName.POWER])
        ),
        []
    );
});

test("resolves shared and function-valued contextual help identifiers", () => {
    const definition = {
        component: "RaceStandingList",
        helpId: ({ params }) => `RaceStandingList.${params.type}`,
    };

    assert.deepEqual(
        resolveRouteHelpIds(
            {
                definition,
                params: { type: "Pending" },
                path: "/RsList/Pending",
            },
            context()
        ),
        ["RaceStandingList", "RaceStandingList.Pending"]
    );
});

test("omits an empty contextual help identifier", () => {
    assert.deepEqual(
        resolveRouteHelpIds({
            definition: {
                component: "DriverList",
                helpId: ({ params }) =>
                    params.selectable ? "DriverList.Selection" : null,
            },
            params: { selectable: null },
            path: "/drivers",
        }),
        ["DriverList"]
    );
});

test("combines shared and contextual help without leaking another context", () => {
    const catalog = createHelpCatalog([
        "./RaceStandingList.help.md",
        "./RaceStandingList.History.help.md",
        "./RaceStandingList.Pending.help.md",
        "./RaceStandingList.Pending.help.CAN_ADD_PENDING.md",
    ]);

    assert.deepEqual(
        getVisibleHelpDescriptors(
            catalog,
            ["RaceStandingList", "RaceStandingList.Pending"],
            context([RoleName.POWER])
        ).map((descriptor) => descriptor.key),
        [
            "./RaceStandingList.help.md",
            "./RaceStandingList.Pending.help.md",
            "./RaceStandingList.Pending.help.CAN_ADD_PENDING.md",
        ]
    );
    assert.deepEqual(
        getVisibleHelpDescriptors(
            catalog,
            ["RaceStandingList", "RaceStandingList.History"],
            context([RoleName.POWER])
        ).map((descriptor) => descriptor.key),
        ["./RaceStandingList.help.md", "./RaceStandingList.History.help.md"]
    );
});

test("resolves distinct add-race help from the route mode", () => {
    const definition = routeDefinitions.find(
        (route) => route.id === "raceStandingAdd"
    );

    assert.deepEqual(
        resolveRouteHelpIds({
            definition,
            params: { type: "RaceStanding" },
            path: "/raceStandingAdd/RaceStanding",
        }),
        ["RaceStandingAdd", "RaceStandingAdd.Pending"]
    );
    assert.deepEqual(
        resolveRouteHelpIds({
            definition,
            params: { type: "RacePhase" },
            path: "/raceStandingAdd/RacePhase",
        }),
        ["RaceStandingAdd", "RaceStandingAdd.Blocks"]
    );
});

test("all repository help filenames are valid", () => {
    const repositoryKeys = readdirSync(new URL("../help", import.meta.url)).map(
        (filename) => `./${filename}`
    );

    assert.doesNotThrow(() => createHelpCatalog(repositoryKeys));
});

test("all stable routed components have public help", () => {
    const repositoryKeys = readdirSync(new URL("../help", import.meta.url)).map(
        (filename) => `./${filename}`
    );
    const componentsWithPublicHelp = new Set(
        createHelpCatalog(repositoryKeys)
            .filter((descriptor) => descriptor.permission === null)
            .map((descriptor) => descriptor.helpId)
    );
    const intentionallyUnhelped = new Set([
        "ForceLoad",
        "ForceReloadPage",
        "MediaViewer",
    ]);
    const missing = [
        ...new Set(routeDefinitions.map((route) => route.component)),
    ].filter(
        (componentName) =>
            !componentsWithPublicHelp.has(componentName) &&
            !intentionallyUnhelped.has(componentName)
    );

    assert.deepEqual(missing, []);
});

test("Markdown rendering escapes HTML and marks external links", () => {
    const html = createRouteHelpMarkdownRenderer().render(
        '<script>alert("no")</script>\n\n[External](https://example.com)'
    );

    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /target="_blank"/);
    assert.match(html, /rel="noopener noreferrer"/);
    assert.match(html, /class="external-help-link"/);
});
