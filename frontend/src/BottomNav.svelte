<script>
    /*
     ** this component should be added to the Bottom of the page.
     **   it will install a placeholder div so that bottom nav does not obscure scrolling.
     **   When scrolled to max bottom, the bottomNav placeholder should end up exactly underneath(z wise)
     **   the actual nav bar.    since placeholder is empty, nothing is obscured.
     **
     */
    import log from "loglevel";

    import { showBottomNav, selectedToolbarList, theme } from "./stores.js";
    import { location } from "svelte-spa-router";
    import StatusMessage from "./StatusMessage.svelte";

    import { onMount } from "svelte";
    let mounted = false;
    let thisBottomNav;
    let placeholderHeight = "0px";

    onMount(async () => {
        mounted = true;
    });
    $: {
        log.debug("current page is ", $location);
    }
    $: {
        let bottomNavHeight = 0;
        if ($showBottomNav && mounted && thisBottomNav) {
            bottomNavHeight = thisBottomNav.offsetHeight;
        }
        placeholderHeight = `${bottomNavHeight}px`;

        log.debug("placeholderHeight: ", placeholderHeight);
    }

    /* Toggle between adding and removing the "responsive" class to the navbar when the user clicks on the icon */
    const myFunction = () => {
        let x = document.getElementById("bottomNavBar");
        if (x.className === "navbar") {
            x.className += " responsive";
        } else {
            x.className = "navbar";
        }
    };
    const getIsSelected = (tabRoute, currentRoute) => {
        log.debug("ghc: current page is ", $location);

        if (currentRoute.includes(tabRoute)) {
            return true;
        } else {
            return false;
        }
    };
</script>

<style>
    .footer {
        position: fixed;
        bottom: 0;
        left: 0;
        z-index: 80;
        overflow: hidden;
        width: 100%;
        background-color: #333;
    }

    /* Place the navbar at the bottom of the page, and make it stick */
    .navbar {
        background-color: #333;

        /* override body padding */
        padding: 0px;
        /* override bootstrap margin*/
        margin: 0px;
        margin-bottom: 0px;
    }

    /* Style the links inside the navigation bar */
    .navbar a {
        float: left;
        display: block;
        color: #f2f2f2;
        text-align: center;
        padding: 7px 0px 7px 0px;
        text-decoration: none;
        font-size: 17px;
        width: 25%;
    }

    /* Hide the link that should open and close the navbar on small screens */
    .navbar .icon {
        display: none;
    }
</style>

{#if $showBottomNav}
    <div
        class="bottomNavScrollPlaceholder"
        style="height: {placeholderHeight};"
    />
{/if}
<div class="footer">
    <StatusMessage />
    {#if $showBottomNav}
        <div
            bind:this={thisBottomNav}
            class="navbar"
            id="bottomNavBar"
        >
            {#each $selectedToolbarList as item, index (item.path)}
                <a
                    href="/#/{item.path}"
                    style="background-color: {getIsSelected(
                        item.path,
                        $location
                    )
                        ? $theme
                        : '#333'}"
                >
                    {item.text}
                </a>
            {/each}
            <a
                href="javascript:void(0);"
                class="icon"
                on:click|preventDefault={myFunction}
            >
                &#9776;
            </a>
        </div>
    {/if}
</div>
