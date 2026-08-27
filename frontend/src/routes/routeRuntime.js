import { routeComponents } from "./routeComponents.js";
import DecodedRoute from "./DecodedRoute.svelte";

/** Validated route metadata used by both Svelte rendering and UI policy. */
export const routeRegistry = require("./routeCatalog.js");

/**
 * Adapts svelte-spa-router's raw path captures before they reach a screen.
 * Keeping this at the rendering boundary prevents every routed component from
 * needing its own decodeURIComponent calls.
 */
function withDecodedParams(component) {
    return class extends DecodedRoute {
        constructor(options) {
            super({
                ...options,
                props: { ...options.props, component },
            });
        }
    };
}

/**
 * Component map in the shape expected by svelte-spa-router.
 * Construction fails fast when a definition names an unknown component.
 */
export const routerMap = Object.fromEntries(
    routeRegistry.definitions.map((definition) => {
        const component = routeComponents[definition.component];
        if (!component) {
            throw new Error(
                `Route ${definition.id} references unknown component ${definition.component}`
            );
        }
        return [definition.path, withDecodedParams(component)];
    })
);
