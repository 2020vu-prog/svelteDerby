"use strict";

const regexparamModule = require("regexparam");
const regexparam = regexparamModule.default || regexparamModule;
const RoutePermission = require("../../../backend/modules/lambdaDerby/src/shared/RoutePermission.js");

/**
 * Runtime state available when resolving permissions, menus, and actions.
 * Route resolvers additionally receive `params` and `route`.
 *
 * @typedef {Object} RouteContext
 * @property {Object} [raceConfig]
 * @property {string} [raceConfig.orgId]
 * @property {string} [raceConfig.orgIz]
 * @property {Object<string, Object<string, string[]>>} [roleMap]
 * @property {string} [userEmail]
 * @property {string} [userId]
 * @property {string} [orgIz] Explicit organization override for access checks.
 * @property {Object<string, string|null>} [params] Decoded parameters from the matched route.
 * @property {RouteDefinition} [route]
 */

/**
 * A value that may be static or derived from the current route context.
 *
 * @template T
 * @typedef {T|function(RouteContext): T} RouteValue
 */

/**
 * Declarative definition of one application route.
 *
 * @typedef {Object} RouteDefinition
 * @property {string} id Stable identifier used by tests and menu entries.
 * @property {string} path `regexparam`/svelte-spa-router path pattern.
 * @property {string} component Key in routeComponents.
 * @property {RouteValue<RoutePermission>} permission Required route access level or named permission.
 * @property {RouteValue<string>} [permissionOrgIz] Organization used for permission resolution.
 * @property {Object} [menu] Primary navigation metadata.
 * @property {Object[]} [menuAliases] Additional navigation entries for the same route.
 * @property {Object} [action] Contextual action displayed while this route is active.
 */

/**
 * Result of matching a URL path against a compiled route definition.
 *
 * @typedef {Object} RouteMatch
 * @property {RouteDefinition} definition
 * @property {Object<string, string|null>} params Decoded URL parameters.
 * @property {string} path Original matched path.
 */

/**
 * Validated collection used to look up and match route definitions.
 *
 * @typedef {Object} RouteRegistry
 * @property {RouteDefinition[]} definitions
 * @property {function(string): RouteDefinition|undefined} getById
 * @property {function(string): RouteMatch|null} match
 */

/** @param {RouteDefinition} definition */
function assertDefinition(definition) {
    if (!definition || !definition.id || !definition.path) {
        throw new Error("Every route requires a unique id and path.");
    }
    if (!Object.prototype.hasOwnProperty.call(definition, "permission")) {
        throw new Error(`Route ${definition.id} must specify a permission.`);
    }
    if (typeof definition.permission !== "function") {
        RoutePermission.from(definition.permission);
    }
}

/**
 * Decodes one URL parameter while preserving malformed input for the screen.
 *
 * @param {string|null|undefined} value
 * @returns {RoutePermission|undefined}
 */
function decode(value) {
    if (value == null) return value;
    try {
        return decodeURIComponent(value);
    } catch (error) {
        return value;
    }
}

/**
 * Compiles a route's path pattern and retains its declarative metadata.
 *
 * @param {RouteDefinition} definition
 * @returns {RouteDefinition & {keys: string[], pattern: RegExp}}
 */
function compileDefinition(definition) {
    const { keys, pattern } = regexparam(definition.path);
    return { ...definition, keys, pattern };
}

/**
 * Matches a path against one compiled definition.
 *
 * @param {RouteDefinition & {keys: string[], pattern: RegExp}} definition
 * @param {string} path
 * @returns {RouteMatch|null}
 */
function matchCompiledRoute(definition, path) {
    const matches = definition.pattern.exec(path);
    if (!matches) return null;

    const params = {};
    definition.keys.forEach((key, index) => {
        params[key] = decode(matches[index + 1] || null);
    });
    return { definition, params, path };
}

/**
 * Builds a validated, testable registry shared by routing, menus, and actions.
 *
 * @param {RouteDefinition[]} definitions
 * @returns {RouteRegistry}
 */
function createRouteRegistry(definitions) {
    const ids = new Set();
    const paths = new Set();
    const compiled = definitions.map((definition) => {
        assertDefinition(definition);
        if (ids.has(definition.id)) {
            throw new Error(`Duplicate route id: ${definition.id}`);
        }
        if (paths.has(definition.path)) {
            throw new Error(`Duplicate route path: ${definition.path}`);
        }
        ids.add(definition.id);
        paths.add(definition.path);
        return compileDefinition(definition);
    });

    const byId = new Map(
        compiled.map((definition) => [definition.id, definition])
    );

    return Object.freeze({
        definitions: compiled,
        getById(id) {
            return byId.get(id);
        },
        match(path) {
            for (const definition of compiled) {
                const match = matchCompiledRoute(definition, path);
                if (match) return match;
            }
            return null;
        },
    });
}

/**
 * Resolves a static value or invokes a context-dependent route resolver.
 *
 * @template T
 * @param {RouteValue<T>} value
 * @param {RouteContext} context
 * @returns {T}
 */
function resolveRouteValue(value, context) {
    return typeof value === "function" ? value(context) : value;
}

/**
 * Resolves the permission required by a matched route.
 *
 * @param {RouteMatch|null} match
 * @param {RouteContext} [context]
 * @returns {string|null|undefined}
 */
function getRequiredPermission(match, context = {}) {
    if (!match) return undefined;
    return RoutePermission.from(
        resolveRouteValue(match.definition.permission, {
            ...context,
            params: match.params,
            route: match.definition,
        })
    );
}

/**
 * Resolves the organization against which route permission is checked.
 *
 * @param {RouteMatch|null} match
 * @param {RouteContext} [context]
 * @returns {string|undefined}
 */
function getPermissionOrgIz(match, context = {}) {
    if (!match) return undefined;
    return resolveRouteValue(match.definition.permissionOrgIz, {
        ...context,
        params: match.params,
        route: match.definition,
    });
}

/**
 * Builds an ordered menu section from routes visible to the current user.
 *
 * @param {RouteRegistry} registry
 * @param {string} section
 * @param {RouteContext} context
 * @param {function(RouteMatch, RouteContext): boolean} canAccess
 * @returns {{id: string, menuRoute: string, text: string}[]}
 */
function getMenuItems(registry, section, context, canAccess) {
    return registry.definitions
        .flatMap((definition) =>
            [definition.menu, ...(definition.menuAliases || [])]
                .filter(Boolean)
                .map((menu) => ({ definition, menu }))
        )
        .filter(({ menu }) => menu.section === section)
        .filter(({ menu }) => {
            if (menu.requiresEvent === false) return true;
            return Boolean(
                context.raceConfig?.orgIz && context.raceConfig?.orgId
            );
        })
        .filter(({ definition }) =>
            canAccess({ definition, params: {} }, context)
        )
        .sort((left, right) => (left.menu.order || 0) - (right.menu.order || 0))
        .map(({ definition, menu }) => ({
            id: definition.id,
            menuRoute: resolveRouteValue(menu.to, context) || definition.path,
            text: resolveRouteValue(menu.label, context),
        }));
}

/**
 * Resolves the contextual action for a matched route.
 *
 * The action callbacks receive parameters from the current route. Permission
 * for the resulting target is checked later by RouteHost.
 *
 * @param {RouteMatch|null} match
 * @param {RouteContext} [context]
 * @returns {Object|null}
 */
function resolveRouteAction(match, context = {}) {
    const action = match?.definition.action;
    if (!action) return null;
    const actionContext = {
        ...context,
        params: match.params,
        route: match.definition,
    };
    if (action.visible && !action.visible(actionContext)) return null;
    return {
        ...action,
        orgIz: resolveRouteValue(action.orgIz, actionContext),
        target: resolveRouteValue(action.target, actionContext),
    };
}

module.exports = {
    createRouteRegistry,
    getMenuItems,
    getPermissionOrgIz,
    getRequiredPermission,
    resolveRouteAction,
};
