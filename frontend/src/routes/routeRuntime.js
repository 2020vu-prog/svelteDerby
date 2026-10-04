import { routeComponents } from "#src/routes/routeComponents.js";

/** Validated route metadata used by both Svelte rendering and UI policy. */
export const routeRegistry = require("#src/routes/routeCatalog.js");

/**
 * Component map in the shape expected by svelte-spa-router, which decodes
 * the URL parameters it hands to each screen.
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
