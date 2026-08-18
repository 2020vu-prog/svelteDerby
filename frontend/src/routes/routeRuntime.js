import { routeComponents } from "./routeComponents.js";

/** Validated route metadata used by both Svelte rendering and UI policy. */
export const routeRegistry = require("./routeCatalog.js");

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
        return [definition.path, component];
    })
);
