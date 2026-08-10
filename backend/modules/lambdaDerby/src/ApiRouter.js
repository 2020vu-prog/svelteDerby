"use strict";

/**
 * @typedef {Object} RouteDefinition
 * @property {string} permission Permission required to invoke the route. Use
 * `ApiRouter.PUBLIC` only for routes that intentionally bypass authentication.
 * @property {Function} handler Async function invoked as `(event, context)`.
 * @property {boolean} [allowFrozen=false] Allow access when the event is frozen
 * or archived.
 * @property {boolean} [allowMissingOrgId=false] Allow a missing organization ID.
 * @property {boolean} [allowMissingOrgIz=false] Allow a missing organization index.
 * @property {boolean} [allowMissingTtl=false] Allow a missing default TTL.
 * @property {boolean} [loadContext=true] Load request context before dispatch.
 */

/**
 * @typedef {Object} ApiRouterDependencies
 * @property {string} [pathPrefix=""] Prefix removed from incoming event paths.
 * @property {Function} authenticate Async function returning the request principal.
 * @property {Function} authorize Async function receiving
 * `(permission, context, principal)` and returning whether access is allowed.
 * @property {Function} loadContext Async function receiving `(event, principal)`
 * and returning route context such as org ID, roles, TTL, and event config.
 * @property {Function} buildResponse Function that formats response bodies.
 * @property {Function} isFrozen Function that determines whether event config is
 * frozen or archived.
 * @property {{debug: Function}} log Logger used for routing diagnostics.
 */

/**
 * Pluggable API request router with centralized authentication, authorization,
 * request validation, and dispatch.
 */
class ApiRouter {
    /**
     * Creates an empty router. Routes can be installed with `register()` or
     * grouped into reusable plugins installed with `use()`.
     *
     * @param {ApiRouterDependencies} dependencies Router dependencies.
     */
    constructor({
        pathPrefix = "",
        authenticate,
        authorize,
        loadContext,
        buildResponse,
        isFrozen,
        log,
    }) {
        this.pathPrefix = pathPrefix;
        this.authenticate = authenticate;
        this.authorize = authorize;
        this.loadContext = loadContext;
        this.buildResponse = buildResponse;
        this.isFrozen = isFrozen;
        this.log = log;
        this.routes = new Map();
    }

    /**
     * Registers one exact route path and its access policy.
     *
     * @param {string} path Route path beginning with `/`, without `pathPrefix`.
     * @param {RouteDefinition} definition Handler, permission, and route policy.
     * @returns {ApiRouter} This router for fluent registration.
     * @throws {Error} If the path, handler, or permission is missing, or if the
     * path has already been registered.
     */
    register(path, definition) {
        if (!path || !path.startsWith("/")) {
            throw new Error("Route path must start with /");
        }
        if (!definition || typeof definition.handler !== "function") {
            throw new Error(`Route ${path} requires a handler`);
        }
        if (!definition.permission) {
            throw new Error(`Route ${path} requires a permission`);
        }
        if (this.routes.has(path)) {
            throw new Error(`Route ${path} is already registered`);
        }

        const loadContext = definition.loadContext !== false;
        this.routes.set(path, {
            allowFrozen: !loadContext,
            allowMissingOrgId: !loadContext,
            allowMissingOrgIz: !loadContext,
            allowMissingTtl: !loadContext,
            loadContext,
            ...definition,
            public: definition.permission === ApiRouter.PUBLIC,
        });
        return this;
    }

    /**
     * Installs a route plugin. A plugin receives this router and registers one
     * or more routes.
     *
     * @param {function(ApiRouter): void} plugin Route registration function.
     * @returns {ApiRouter} This router for fluent plugin installation.
     */
    use(plugin) {
        plugin(this);
        return this;
    }

    /**
     * Returns non-handler metadata for all registered routes.
     *
     * @returns {Array<{path: string, permission: string, public: boolean}>}
     * Registered route inventory in registration order.
     */
    list() {
        return Array.from(this.routes.entries()).map(([path, definition]) => ({
            path,
            permission: definition.permission,
            public: Boolean(definition.public),
        }));
    }

    /**
     * Authenticates, authorizes, validates, and dispatches one API event.
     * Public routes skip authentication and authorization. Context-free routes
     * also skip organization, TTL, and frozen-event validation.
     *
     * @param {{path: string}} event API Gateway-style request event.
     * @returns {Promise<*>} The route handler or response-builder result.
     */
    async dispatch(event) {
        const routePath = this.getRoutePath(event.path);
        const route = this.routes.get(routePath);
        if (!route) {
            this.log.debug(`Unhandled Path: ${routePath} ep: ${event.path}`);
            return this.buildResponse({ status: "unhandled", error: "Unhandled" });
        }

        let principal = { email: "Anonymous" };
        if (!route.public) {
            principal = await this.authenticate(event);
        }

        const context = route.loadContext
            ? await this.loadContext(event, principal)
            : {};

        if (
            !route.public &&
            !(await this.authorize(route.permission, context, principal))
        ) {
            this.log.debug(
                `prohibiting access to ${routePath} for [${principal.email}]`
            );
            return this.buildResponse({ error: "unauthorized", statusCode: 401 });
        }

        if (!route.allowMissingOrgId && !context.orgId) {
            return this.buildResponse({ error: "Unable to determine orgId" });
        }
        if (!route.allowMissingOrgIz && !context.orgIz) {
            return this.buildResponse({ error: "Unable to determine orgIz" });
        }
        if (!route.allowMissingTtl && !context.defaultTTL) {
            return this.buildResponse({ error: "Unable to determine default TTL" });
        }
        if (!route.allowFrozen && this.isFrozen(context.config)) {
            return this.buildResponse({
                error: "Can't edit a frozen/archived race",
            });
        }

        this.log.debug(`route handling: ${routePath}`, route);
        return route.handler(event, {
            ...context,
            ...principal,
            permission: route.permission,
        });
    }

    /**
     * Normalizes an incoming event path for exact route lookup.
     *
     * @param {string} eventPath Incoming API event path.
     * @returns {string} Path with the configured prefix removed.
     */
    getRoutePath(eventPath) {
        if (!eventPath || typeof eventPath !== "string") {
            return "";
        }
        return eventPath.startsWith(this.pathPrefix)
            ? eventPath.substring(this.pathPrefix.length) || "/"
            : eventPath;
    }
}

/** Permission marker for deliberately unauthenticated routes. */
ApiRouter.PUBLIC = "Public";

module.exports = ApiRouter;
