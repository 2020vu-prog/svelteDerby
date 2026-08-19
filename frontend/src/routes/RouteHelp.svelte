<script>
    import { tick } from "svelte";
    import { theme } from "../stores.js";
    import { loadHelpMarkdown, resolveVisibleHelp } from "./routeHelpLoader.js";
    const { resolveRouteHelpIds } = require("./routeHelp.js");

    /** @type {import("./routeRegistry.js").RouteMatch|null} */
    export let currentMatch = null;
    /** @type {import("./routeRegistry.js").RouteContext} */
    export let context = {};

    let isOpen = false;
    let loading = false;
    let loadError = "";
    let sections = [];
    let loadedSignature = "";
    let loadRequest = 0;
    let launcher;
    let closeButton;
    let previousHelpContext = "";
    let markdownPromise;

    $: helpIds = resolveRouteHelpIds(currentMatch, context);
    $: helpContext = helpIds.join("|");
    $: visibleHelp = resolveVisibleHelp(helpIds, context);
    $: visibleSignature = visibleHelp
        .map((descriptor) => descriptor.key)
        .join("|");
    $: if (helpContext !== previousHelpContext) {
        previousHelpContext = helpContext;
        isOpen = false;
        sections = [];
        loadedSignature = "";
        loadRequest += 1;
    }
    $: if (!visibleHelp.length && isOpen) {
        closeHelp(false);
    }
    $: if (isOpen && visibleSignature !== loadedSignature) {
        loadSections(visibleHelp, visibleSignature);
    }

    async function openHelp() {
        if (loadError) loadedSignature = "";
        isOpen = true;
        await tick();
        closeButton?.focus();
    }

    async function closeHelp(restoreFocus = true) {
        isOpen = false;
        if (restoreFocus) {
            await tick();
            launcher?.focus();
        }
    }

    async function loadSections(descriptors, signature) {
        const request = ++loadRequest;
        loadedSignature = signature;
        loading = true;
        loadError = "";

        try {
            const markdown = await getMarkdownRenderer();
            const loadedSections = await Promise.all(
                descriptors.map(async (descriptor) => ({
                    key: descriptor.key,
                    html: markdown.render(await loadHelpMarkdown(descriptor)),
                }))
            );
            if (request === loadRequest) sections = loadedSections;
        } catch (error) {
            if (request === loadRequest) {
                sections = [];
                loadError = "Help could not be loaded.";
                console.error("Route help load failed", error);
            }
        } finally {
            if (request === loadRequest) loading = false;
        }
    }

    async function getMarkdownRenderer() {
        if (!markdownPromise) {
            markdownPromise = import(
                /* webpackChunkName: "route-help-markdown" */ "./routeHelpMarkdown.js"
            ).then(({ createRouteHelpMarkdownRenderer }) =>
                createRouteHelpMarkdownRenderer()
            );
        }
        return markdownPromise;
    }

    function handleWindowKeydown(event) {
        if (isOpen && event.key === "Escape") closeHelp();
    }
</script>

<svelte:window on:keydown={handleWindowKeydown} />

<style>
    .help-launcher {
        position: fixed;
        left: 20px;
        bottom: 80px;
        z-index: 99;
        width: 48px;
        height: 48px;
        border: 0;
        border-radius: 50%;
        box-shadow: 0 6px 10px #666;
        color: white;
        font-size: 1.75rem;
        font-weight: 700;
        line-height: 1;
    }

    .help-launcher:hover,
    .help-launcher:focus-visible {
        box-shadow: 0 6px 14px #666;
        transform: scale(1.05);
    }

    .help-backdrop {
        position: fixed;
        inset: 0;
        z-index: 300;
        display: flex;
        justify-content: flex-end;
        background: rgb(0 0 0 / 45%);
    }

    .help-panel {
        width: min(430px, 100%);
        height: 100%;
        overflow-y: auto;
        background: white;
        box-shadow: -4px 0 18px rgb(0 0 0 / 30%);
    }

    .help-header {
        position: sticky;
        top: 0;
        z-index: 1;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1rem;
        color: white;
    }

    .help-header h2 {
        margin: 0;
        font-size: 1.35rem;
    }

    .help-close {
        min-width: 44px;
        min-height: 44px;
        border: 0;
        background: transparent;
        color: inherit;
        font-size: 2rem;
        line-height: 1;
    }

    .help-content {
        padding: 1rem 1.25rem 2rem;
        color: #222;
    }

    .help-section + .help-section {
        margin-top: 1.5rem;
        padding-top: 1rem;
        border-top: 1px solid #ccc;
    }

    .help-status {
        padding: 1rem;
    }

    .help-error {
        color: #a40000;
    }

    .help-section :global(h1) {
        font-size: 1.4rem;
    }

    .help-section :global(h2) {
        font-size: 1.2rem;
    }

    .help-section :global(a.external-help-link::after) {
        content: " ↗";
    }

    @media (max-width: 600px) {
        .help-backdrop {
            align-items: flex-end;
        }

        .help-panel {
            width: 100%;
            height: auto;
            max-height: 78vh;
            border-radius: 14px 14px 0 0;
            box-shadow: 0 -4px 18px rgb(0 0 0 / 30%);
        }
    }
</style>

{#if visibleHelp.length}
    <button
        bind:this={launcher}
        type="button"
        class="help-launcher"
        style="background-color: {$theme}"
        aria-label="Help for this screen"
        aria-expanded={isOpen}
        on:click={openHelp}>?</button
    >
{/if}

{#if isOpen}
    <div class="help-backdrop" role="presentation" on:click={closeHelp}>
        <section
            class="help-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="route-help-title"
            on:click|stopPropagation
        >
            <header class="help-header" style="background-color: {$theme}">
                <h2 id="route-help-title">Help</h2>
                <button
                    bind:this={closeButton}
                    type="button"
                    class="help-close"
                    aria-label="Close help"
                    on:click={() => closeHelp()}>×</button
                >
            </header>

            {#if loading}
                <p class="help-status">Loading help…</p>
            {:else if loadError}
                <p class="help-status help-error" role="alert">{loadError}</p>
            {:else}
                <div class="help-content">
                    {#each sections as section (section.key)}
                        <article class="help-section">
                            {@html section.html}
                        </article>
                    {/each}
                </div>
            {/if}
        </section>
    </div>
{/if}
