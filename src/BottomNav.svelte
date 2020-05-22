<script>
    import { showBottomNav, theme } from "./stores.js";
    import { location } from "svelte-spa-router";

    $: {
        console.log("current page is ", $location);
    }
    /* Toggle between adding and removing the "responsive" class to the navbar when the user clicks on the icon */
    const myFunction = () => {
        var x = document.getElementById("myNavbar");
        if (x.className === "navbar") {
            x.className += " responsive";
        } else {
            x.className = "navbar";
        }
    };
    const getIsSelected = (tabRoute, currentRoute) => {
        console.log("ghc: current page is ", $location);

        if (currentRoute.includes(tabRoute)) {
            return true;
        } else {
            return false;
        }
    };
</script>

<style>
    /* Place the navbar at the bottom of the page, and make it stick */
    .navbar {
        background-color: #333;
        overflow: hidden;
        position: fixed;
        bottom: 0;
        width: 100%;
    }

    /* Style the links inside the navigation bar */
    .navbar a {
        float: left;
        display: block;
        color: #f2f2f2;
        text-align: center;
        padding: 14px 16px;
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
    <div class="navbar" id="myNavbar" style="z-index:20">
        <a
            href="/#/RpList"
            style="background-color: {getIsSelected('RpList', $location) ? $theme : '#333'}">
            Phases
        </a>
        <a
            href="/#/RsList/History"
            style="background-color: {getIsSelected('RsList/History', $location) ? $theme : '#333'}">
            Races
        </a>
        <a
            href="/#/RsList/Pending"
            style="background-color: {getIsSelected('RsList/Pending', $location) ? $theme : '#333'}">
            Pending
        </a>
        <a
            href="/#/chartList"
            style="background-color: {getIsSelected('chartList', $location) ? $theme : '#333'}">
            Charts
        </a>
        <a
            href="javascript:void(0);"
            class="icon"
            on:click|preventDefault={myFunction}>
            &#9776;
        </a>
    </div>
{/if}
