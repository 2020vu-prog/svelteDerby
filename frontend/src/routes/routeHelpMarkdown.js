"use strict";

const MarkdownIt = require("markdown-it");

/**
 * Creates the restricted Markdown renderer used by route help.
 *
 * Raw HTML remains disabled. External HTTP links open separately, carry safe
 * relationship attributes, and receive a class that adds a visible marker.
 *
 * @returns {MarkdownIt}
 */
function createRouteHelpMarkdownRenderer() {
    const markdown = new MarkdownIt({ html: false, linkify: true });
    const defaultLinkOpen =
        markdown.renderer.rules.link_open ||
        ((tokens, index, options, env, renderer) =>
            renderer.renderToken(tokens, index, options));

    markdown.renderer.rules.link_open = (
        tokens,
        index,
        options,
        env,
        renderer
    ) => {
        const href = tokens[index].attrGet("href") || "";
        if (/^https?:\/\//i.test(href)) {
            tokens[index].attrSet("target", "_blank");
            tokens[index].attrSet("rel", "noopener noreferrer");
            tokens[index].attrJoin("class", "external-help-link");
        }
        return defaultLinkOpen(tokens, index, options, env, renderer);
    };

    return markdown;
}

module.exports = { createRouteHelpMarkdownRenderer };
