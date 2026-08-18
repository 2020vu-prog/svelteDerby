<script>
    import { faEllipsisV } from "@fortawesome/free-solid-svg-icons/faEllipsisV";
    import Icon from "fa-svelte";
    import { createEventDispatcher } from "svelte";
    import { push } from "svelte-spa-router";
    import { theme } from "./stores.js";

    $: {
        document.documentElement.style.setProperty("--themeFromJS", $theme);
    }

    export let text = "";
    export let menu = [];
    export let style = "";

    const dispatch = createEventDispatcher();
    let menuOpen = false;

    $: hasMenu = Array.isArray(menu) && menu.length > 0;

    function getMenuText(item) {
        return item.text || item.label || item.name || item.title || "Menu";
    }

    function toggleMenu() {
        menuOpen = !menuOpen;
    }

    function handleMenu(item) {
        menuOpen = false;
        dispatch("menu", item);

        if (item.disabled) {
            return;
        }
        if ("function" === typeof item.onClick) {
            item.onClick(item);
            return;
        }
        if ("function" === typeof item.click) {
            item.click(item);
            return;
        }
        if ("function" === typeof item.action) {
            item.action(item);
            return;
        }
        if (item.menuRoute) {
            push(item.menuRoute);
            return;
        }
        if (item.href) {
            window.location.href = item.href;
        }
    }
</script>

{#if text}
    <div class="annotationWrap" {style}>
        <div class="annotation">
            <span class="annotationText">{text}</span>
            {#if hasMenu}
                <button
                    aria-label="Annotation menu"
                    class="menuButton"
                    type="button"
                    on:click={toggleMenu}
                >
                    <Icon icon={faEllipsisV} />
                </button>
            {/if}
        </div>
        {#if hasMenu && menuOpen}
            <div class="menuPanel">
                {#each menu as item}
                    <button
                        class="menuItem"
                        disabled={item.disabled}
                        type="button"
                        on:click={() => handleMenu(item)}
                    >
                        {getMenuText(item)}
                    </button>
                {/each}
            </div>
        {/if}
    </div>
{/if}

<style>
    .annotationWrap {
        position: relative;
        width: 100%;
    }

    .annotation {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;

        width: 100%;
        padding: 0.2rem 0.4rem;

        background: var(--themeFromJS);
        border: 1px solid;
        border-radius: 6px;
        color: white;
    }

    .annotationText {
        flex: 1;
        min-width: 0;
        font-size: 1.25rem;
        overflow-wrap: anywhere;
    }

    .menuButton {
        display: flex;
        align-items: center;
        justify-content: center;

        padding: 0;
        margin: 0;
        border: none;
        background: transparent;
        color: inherit;
    }

    .menuPanel {
        position: absolute;
        top: calc(100% + 2px);
        right: 0;
        z-index: 30;

        min-width: 12rem;
        background: white;
        border: 1px solid var(--themeFromJS);
        box-shadow: 0 0.25rem 0.75rem rgb(0, 0, 0, 0.2);
    }

    .menuItem {
        display: block;
        width: 100%;
        padding: 0.5rem 0.75rem;

        border: none;
        background: white;
        color: #222;
        text-align: left;
    }

    .menuItem:disabled {
        color: #777;
    }
</style>
