"use strict";

const {
    hasPermission,
} = require("../../../backend/modules/lambdaDerby/src/shared/PermissionLookup.js");
const {
    getPermissionOrgIz,
    getRequiredPermission,
} = require("./routeRegistry.js");
const { RoutePermission } = require("./routePermission.js");

/**
 * Returns the current user's roles for an organization.
 *
 * @param {import("./routeRegistry.js").RouteContext} context
 * @param {string} [orgIzOverride] Organization to use instead of the selected event's organization.
 * @returns {string[]}
 */
function getRoleList(context, orgIzOverride) {
    const orgIz = orgIzOverride || context.raceConfig?.orgIz;
    const userRoles = context.roleMap?.[context.userEmail];
    return (orgIz && userRoles?.[orgIz]) || [];
}

/**
 * Determines whether the current user may render a matched route.
 * Public routes have no required permission. Protected routes are checked
 * against roles for the route-specific organization, when one is defined.
 *
 * @param {import("./routeRegistry.js").RouteMatch|null} match
 * @param {import("./routeRegistry.js").RouteContext} [context]
 * @returns {boolean}
 */
function canAccessRoute(match, context = {}) {
    if (!match) return false;
    const permission = getRequiredPermission(match, context);
    if (permission === RoutePermission.PUBLIC) return true;
    const permissionOrgIz = context.orgIz || getPermissionOrgIz(match, context);
    return hasPermission(
        getRoleList(context, permissionOrgIz),
        permission.toString()
    );
}

/**
 * Checks a named frontend capability without requiring a route match.
 *
 * @param {string} permission
 * @param {import("./routeRegistry.js").RouteContext} [context]
 * @returns {boolean}
 */
function hasNamedPermission(permission, context = {}) {
    return hasPermission(
        getRoleList(context, context.orgIz),
        RoutePermission.from(permission).toString()
    );
}

module.exports = {
    canAccessRoute,
    getRoleList,
    hasNamedPermission,
};
