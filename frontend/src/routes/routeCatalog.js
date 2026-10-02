"use strict";

const { routeDefinitions } = require("#src/routes/routeDefinitions.js");
const { createRouteRegistry } = require("#src/routes/routeRegistry.js");

/**
 * Application route catalog compiled and validated independently of Svelte.
 * @type {import("#src/routes/routeRegistry.js").RouteRegistry}
 */
module.exports = createRouteRegistry(routeDefinitions);
