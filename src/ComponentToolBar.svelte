<script>
    import { theme } from "./stores.js";
    import { raceConfig, statusMessage } from "./stores.js";
    import axios from "axios";
    import { Auth } from "aws-amplify";
    import { onMount } from "svelte";
    import { push, replace } from "svelte-spa-router";

    export let dbName;
    export let dbKey;
    export let timerLink;
    export let bracketLink;
    onMount(async () => {
        console.log("timerLink: ", timerLink);
        console.log("bracketLink: ", bracketLink);
    });
    /* Toggle between adding and removing the "responsive" class to the navbar when the user clicks on the icon */
    const myFunction = () => {
        console.log("myFunction");
    };
    const doDelete = () => {
        console.log("toolbar deleting", dbName, dbKey);
        requestDelete(dbName, dbKey);
    };

    async function requestDelete() {
        console.log(`requestDelete: ${dbName} ${dbKey}`);
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            SK: dbKey,
        };

        axios.defaults.headers.common["Authorization"] = bearer;

        const endpoint =
            dbName === "RacePhase" ? "/deleteRacePhase" : "/deleteRaceStanding";

        try {
            const response = await axios.post(
                $raceConfig.baseUrl + endpoint,
                req
            );
            if (response.data.status === "error") {
                $statusMessage = {
                    text: response.data.error,
                    type: response.data.status,
                };
            } else {
                $statusMessage = {
                    text: `[${dbName}] Deleted.`,
                    type: "success",
                };
            }
        } catch (e) {
            $statusMessage = {
                text: response.data.error,
                type: "error",
            };
        }
    }
    const gotoTimer = () => {
        console.log("routing to:", timerLink);
        push(timerLink);
    };
    const gotoBracket = () => {
        console.log("routing to bracket:", bracketLink);
        push(bracketLink);
    };
</script>

<style>
    /* Place the navbar at the bottom of the page, and make it stick */

    .navbar {
        background-color: #333;
        overflow: hidden;
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
        font-size: 12px;
        width: 25%;
    }

    /* Hide the link that should open and close the navbar on small screens */
    .navbar .icon {
        display: none;
    }
</style>

<div class="navbar" id="myNavbar" style="z-index:20">
    {#if timerLink}
        <a style="background-color: {$theme}" on:click={() => gotoTimer()}>
            Timer
        </a>
    {/if}
    <a style="background-color: {$theme}">History</a>

    {#if bracketLink}
        <a style="background-color: {$theme}" on:click={() => gotoBracket()}>
            Bracket
        </a>
    {/if}

    <a style="background-color: {$theme}" on:click|preventDefault={doDelete}>
        Delete
    </a>
    <a
        href="javascript:void(0);"
        class="icon"
        on:click|preventDefault={myFunction}>
        &#9776;
    </a>
</div>
