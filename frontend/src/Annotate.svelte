<script>
    import { faEllipsisV } from "@fortawesome/free-solid-svg-icons/faEllipsisV";
    import Icon from "fa-svelte";
    import { createEventDispatcher } from "svelte";
    import { push } from "svelte-spa-router";

    export let text = "";
    export let menu = [];

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

<style>
    .annotationWrap {
        position: relative;
        width: 100%;
    }

    .annotation {
        align-items: center;
        background-color: #fff3cd;
        border: 1px solid #b68200;
        color: #3d2b00;
        display: flex;
        font-family: inherit;
        font-size: 1.25rem;
        font-weight: 600;
        justify-content: space-between;
        line-height: 1.2;
        padding: 0.12rem 0.35rem;
        width: 100%;
    }

    .annotationText {
        min-width: 0;
        overflow-wrap: anywhere;
    }

    .menuButton {
        background: transparent;
        border: 0;
        color: #3d2b00;
        flex: 0 0 auto;
        font-size: 1.25rem;
        font-weight: 700;
        line-height: 1;
        margin-left: 0.5rem;
        padding: 0.1rem 0.35rem;
    }

    .menuPanel {
        background: #fff;
        border: 1px solid #b68200;
        box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.2);
        min-width: 12rem;
        position: absolute;
        right: 0;
        top: 100%;
        z-index: 30;
    }

    .menuItem {
        background: #fff;
        border: 0;
        color: #222;
        display: block;
        padding: 0.5rem 0.75rem;
        text-align: left;
        width: 100%;
    }

    .menuItem:disabled {
        color: #777;
    }
</style>

{#if text}
    <div class="annotationWrap">
        <span class="annotation">
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
        </span>
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
