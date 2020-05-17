<script>
    import { showBottomNav } from "./stores.js";
    /* Toggle between adding and removing the "responsive" class to the navbar when the user clicks on the icon */
    function myFunction() {
        var x = document.getElementById("myNavbar");
        if (x.className === "navbar") {
            x.className += " responsive";
        } else {
            x.className = "navbar";
        }
    }
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
    }

    /* Change the color of links on hover */
    .navbar a:hover {
        background-color: #ddd;
        color: black;
    }

    /* Add a green background color to the active link */
    .navbar a.active {
        background-color: #4caf50;
        color: white;
    }

    /* Hide the link that should open and close the navbar on small screens */
    .navbar .icon {
        display: none;
    }
</style>

{#if $showBottomNav}
    <div class="navbar" id="myNavbar" style="z-index:20">
        <a href="/#/RpList" class="active">Phases</a>
        <a href="/#/RsList/History">Races</a>
        <a href="/#/RsList/Pending">Pending</a>
        <a href="/#/chartList">Charts</a>
        <a
            href="javascript:void(0);"
            class="icon"
            on:click|preventDefault={myFunction}>
            &#9776;
        </a>
    </div>
{/if}
