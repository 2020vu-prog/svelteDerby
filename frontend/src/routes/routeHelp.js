"use strict";

const { hasNamedPermission } = require("./routeAccess.js");
const { RoutePermission } = require("./routePermission.js");

const HELP_FILE_PATTERN =
    /^\.\/([A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)*)\.help(?:\.([A-Z][A-Z0-9_]*))?\.md$/;
const HELP_ID_PATTERN = /^[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)*$/;

/**
 * Parses a Webpack help-context key and validates its optional permission.
 *
 * @param {string} key A key such as `./RacePhaseList.help.POWER.md`.
 * @returns {{key: string, helpId: string, permissionKey: string|null, permission: RoutePermission|null}}
 */
function parseHelpFileKey(key) {
    const match = HELP_FILE_PATTERN.exec(key);
    if (!match) {
        throw new Error(`Invalid route help filename: ${key}`);
    }

    const [, helpId, permissionKey = null] = match;
    if (
        permissionKey &&
        !Object.prototype.hasOwnProperty.call(RoutePermission, permissionKey)
    ) {
        throw new Error(
            `Unknown RoutePermission key in route help filename: ${key}`
        );
    }
    if (
        permissionKey &&
        RoutePermission[permissionKey] === RoutePermission.PUBLIC
    ) {
        throw new Error(
            `Public route help must use the base help filename: ${key}`
        );
    }

    return {
        key,
        helpId,
        permissionKey,
        permission: permissionKey ? RoutePermission[permissionKey] : null,
    };
}

/**
 * Creates and validates the build-time help catalog.
 *
 * @param {string[]} keys Webpack context keys.
 * @returns {ReturnType<typeof parseHelpFileKey>[]}
 */
function createHelpCatalog(keys) {
    return keys.map(parseHelpFileKey).sort((left, right) => {
        if (left.permissionKey === right.permissionKey) {
            return left.key.localeCompare(right.key);
        }
        if (left.permissionKey === null) return -1;
        if (right.permissionKey === null) return 1;
        return left.permissionKey.localeCompare(right.permissionKey);
    });
}

/**
 * Returns the help documents available for a routed component and user.
 *
 * Public documents have no permission suffix. Restricted documents use the
 * same permission lookup and organization context as frontend route access.
 *
 * @param {ReturnType<typeof createHelpCatalog>} catalog
 * @param {string|string[]} helpIds
 * @param {import("./routeRegistry.js").RouteContext} [context]
 * @returns {ReturnType<typeof createHelpCatalog>}
 */
function getVisibleHelpDescriptors(catalog, helpIds, context = {}) {
    const visibleHelpIds = new Set(
        Array.isArray(helpIds) ? helpIds : [helpIds]
    );
    return catalog.filter(
        (descriptor) =>
            visibleHelpIds.has(descriptor.helpId) &&
            (!descriptor.permission ||
                hasNamedPermission(descriptor.permission, context))
    );
}

/**
 * Resolves shared component help and optional route-specific help.
 *
 * A function-valued `helpId` receives the same route parameters and context as
 * permission and action resolvers. Returning no identifier leaves only the
 * shared component help active.
 *
 * @param {import("./routeRegistry.js").RouteMatch|null} match
 * @param {import("./routeRegistry.js").RouteContext} [context]
 * @returns {string[]}
 */
function resolveRouteHelpIds(match, context = {}) {
    const componentHelpId = match?.definition?.component;
    if (!componentHelpId) return [];

    const configuredHelpId = match.definition.helpId;
    const routeContext = {
        ...context,
        params: match.params,
        route: match.definition,
    };
    const contextualHelpId =
        typeof configuredHelpId === "function"
            ? configuredHelpId(routeContext)
            : configuredHelpId;
    const helpIds = [...new Set([componentHelpId, contextualHelpId])].filter(
        Boolean
    );

    for (const helpId of helpIds) {
        if (!HELP_ID_PATTERN.test(helpId)) {
            throw new Error(`Invalid route help identifier: ${helpId}`);
        }
    }
    return helpIds;
}

module.exports = {
    createHelpCatalog,
    getVisibleHelpDescriptors,
    parseHelpFileKey,
    resolveRouteHelpIds,
};
