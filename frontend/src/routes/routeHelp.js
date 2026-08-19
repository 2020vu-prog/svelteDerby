"use strict";

const { hasNamedPermission } = require("./routeAccess.js");
const { RoutePermission } = require("./routePermission.js");

const HELP_FILE_PATTERN =
    /^\.\/([A-Za-z][A-Za-z0-9]*)\.help(?:\.([A-Z][A-Z0-9_]*))?\.md$/;

/**
 * Parses a Webpack help-context key and validates its optional permission.
 *
 * @param {string} key A key such as `./RacePhaseList.help.POWER.md`.
 * @returns {{key: string, componentName: string, permissionKey: string|null, permission: RoutePermission|null}}
 */
function parseHelpFileKey(key) {
    const match = HELP_FILE_PATTERN.exec(key);
    if (!match) {
        throw new Error(`Invalid route help filename: ${key}`);
    }

    const [, componentName, permissionKey = null] = match;
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
        componentName,
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
 * @param {string} componentName
 * @param {import("./routeRegistry.js").RouteContext} [context]
 * @returns {ReturnType<typeof createHelpCatalog>}
 */
function getVisibleHelpDescriptors(catalog, componentName, context = {}) {
    return catalog.filter(
        (descriptor) =>
            descriptor.componentName === componentName &&
            (!descriptor.permission ||
                hasNamedPermission(descriptor.permission, context))
    );
}

module.exports = {
    createHelpCatalog,
    getVisibleHelpDescriptors,
    parseHelpFileKey,
};
