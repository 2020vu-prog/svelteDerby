const {
    createHelpCatalog,
    getVisibleHelpDescriptors,
} = require("./routeHelp.js");

const helpContext = require.context(
    "../help",
    false,
    /\.help(?:\.[^.]+)?\.md$/,
    "lazy"
);
const helpCatalog = createHelpCatalog(helpContext.keys());

/**
 * Resolves the authorized help documents for a routed component.
 *
 * @param {string} componentName
 * @param {import("./routeRegistry.js").RouteContext} context
 * @returns {ReturnType<typeof createHelpCatalog>}
 */
export function resolveVisibleHelp(componentName, context) {
    return getVisibleHelpDescriptors(helpCatalog, componentName, context);
}

/**
 * Lazily loads one Markdown help document.
 *
 * @param {{key: string}} descriptor
 * @returns {Promise<string>}
 */
export async function loadHelpMarkdown(descriptor) {
    const loaded = await helpContext(descriptor.key);
    return loaded.default || loaded;
}
