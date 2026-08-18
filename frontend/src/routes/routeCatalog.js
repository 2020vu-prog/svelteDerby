"use strict";

const { routeDefinitions } = require("./routeDefinitions.js");
const { createRouteRegistry } = require("./routeRegistry.js");

/**
 * Application route catalog compiled and validated independently of Svelte.
 * @type {import("./routeRegistry.js").RouteRegistry}
 */
module.exports = createRouteRegistry(routeDefinitions);
