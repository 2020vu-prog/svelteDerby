<script>
    import log from "loglevel";

    import { theme, driverMap } from "./stores.js";
    import { axios, raceConfig, statusMessage, userEmail } from "./stores.js";

    import { onMount } from "svelte";
    import { push, replace } from "svelte-spa-router";
    import { isEmailAllowedRoutePath } from "./utils.js";
    const EntityFactory = require("../../backend/modules/lambdaDerby/src/shared/EntityFactory.js");

    import { db } from "./eventDb.js";

    export let dbName;
    export let dbKey;
    export let timerLink;
    export let bracketLink;
    export let cn;

    const mediaLink = `/spMediaList/${dbName}/${dbKey}`;
    onMount(async () => {
        log.debug("timerLink: ", timerLink);
        log.debug("bracketLink: ", bracketLink);
    });
    /* Toggle between adding and removing the "responsive" class to the navbar when the user clicks on the icon */
    const myFunction = () => {
        log.debug("myFunction");
    };

    async function maybeDelete() {
        log.debug("toolbar maybeDelete key", dbName, dbKey);
        const tgt = await db[dbName].get(dbKey);
        log.debug("toolbar maybeDelete tgt", tgt);
        var tgtName = "";
        if (dbName === "RacePhase") {
            tgtName = "Blocks";
        } else if (dbName === "RaceStanding" && tgt.ph2) {
            tgtName = "B-Phase";
        } else if (dbName === "RaceStanding" && tgt.ph1) {
            tgtName = "A-Phase";
        } else if (dbName === "RaceStanding") {
            tgtName = "Pending";
        }
        // used to test "invalid request"
        //tgtName = `${tgtName}X`
        if (tgtName) {
            var result = confirm(`Proceed with [${tgtName}] delete? `);
            if (result) {
                doDelete(dbName, dbKey, tgtName);
            }
        }
    }

    async function doDelete(dbName, dbKey, tgtName) {
        log.debug(`doDelete: ${dbName} ${dbKey}`);

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            SK: dbKey,
            tgtName: tgtName,
        };

        const endpoint =
            dbName === "RacePhase" ? "/deleteRacePhase" : "/deleteRaceStanding";

        try {
            const response = await $axios.post(
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

    async function callCars() {
        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            cn: cn,
            SK: dbKey,
            tags: [{ called: true }, { called: true }],
        };

        const endpoint = "/RaceStanding/addTag";

        try {
            const response = await $axios.post(
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
                    text: `Cars called.`,
                    type: "success",
                };
            }
        } catch (e) {
            $statusMessage = {
                text: e,
                type: "error",
            };
        }
    }

    async function gotoListMedia() {
        push(mediaLink);
    }
    const gotoTimer = () => {
        log.debug("routing to:", timerLink);
        push(timerLink);
    };
    const gotoBracket = () => {
        log.debug("routing to bracket:", bracketLink);
        push(bracketLink);
    };
    function gotoHistory() {
        log.debug("routing to history:");
        var pkSuffix = "";
        if (dbName === "RacePhase") {
            pkSuffix = "RP";
        }
        if (dbName === "RaceStanding") {
            pkSuffix = "RS";
        }
        const PK = `${$raceConfig.orgId}:${pkSuffix}`;
        push(`/historyList/${PK}/${dbKey}`);
    }
    function isManualTimerAllowed() {
        return isEmailAllowedRoutePath($userEmail, "/ManualTimerAdd");
    }
    function isAnnounceAllowed() {
        return isEmailAllowedRoutePath($userEmail, "/ManualAnnouncement");
    }
    function isDeleteAllowed() {
        var protectedPath = "/unknownPath";
        if (dbName === "RacePhase") {
            protectedPath = "/sveltePermissionCanDeleteBlocks";
        }
        if (dbName === "RaceStanding") {
            protectedPath = "/sveltePermissionCanDeleteStanding";
        }
        return isEmailAllowedRoutePath($userEmail, protectedPath);
    }
</script>

<style>
    /* Place the navbar at the bottom of the page, and make it stick */

    .navbar {
        background-color: #333;
        overflow: hidden;
        width: 100%;
        justify-content: space-evenly;
        padding: 1px;
    }

    /* Style the links inside the navigation bar */
    .navbarItem {
        float: left;
        display: block;
        color: #f2f2f2;
        text-align: center;
        padding: 3.5px 4px;
        text-decoration: none;
        font-size: 20px;
        font-weight: bold;
        flex: 1;
        border: 3px solid black;
    }
</style>

<div class="navbar" id="myNavbar" style="z-index:20">
    {#if timerLink && isManualTimerAllowed()}
        <span
            class="navbarItem"
            style="background-color: {$theme}"
            on:click={() => gotoTimer()}>
            Timer
        </span>
    {/if}
    <span
        class="navbarItem"
        style="background-color: {$theme}"
        on:click={gotoHistory}>
        History
    </span>

    {#if bracketLink}
        <span
            class="navbarItem"
            style="background-color: {$theme}"
            on:click={() => gotoBracket()}>
            Bracket
        </span>
    {/if}

    {#if isDeleteAllowed()}
        <span
            class="navbarItem"
            style="background-color: {$theme}"
            on:click|preventDefault={maybeDelete}>
            Delete
        </span>
    {/if}
    {#if dbName === 'RacePhase'}
        <span
            class="navbarItem"
            style="background-color: {$theme}"
            on:click|preventDefault={gotoListMedia}>
            Video
        </span>
    {/if}

    {#if window.location.href.includes('RsList/Pending') && isAnnounceAllowed()}
        <span
            class="navbarItem"
            style="background-color: {$theme}"
            on:click|preventDefault={callCars}>
            Call To Race
        </span>
    {/if}
</div>
