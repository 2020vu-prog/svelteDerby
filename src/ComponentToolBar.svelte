<script>
    import { theme, driverMap } from "./stores.js";
    import { raceConfig, statusMessage, userEmail } from "./stores.js";

    import axios from "axios";
    import { Auth } from "aws-amplify";
    import { onMount } from "svelte";
    import { push, replace } from "svelte-spa-router";
    import { isEmailAllowedRoutePath } from "./utils.js";
    const EntityFactory = require("../backend/modules/lambdaDerby/src/shared/EntityFactory.js");

    import { db } from "./eventDb.js";

    export let dbName;
    export let dbKey;
    export let timerLink;
    export let bracketLink;
    export let cn;

    const mediaLink = `/spMediaList/${dbName}/${dbKey}`;
    onMount(async () => {
        console.log("timerLink: ", timerLink);
        console.log("bracketLink: ", bracketLink);
    });
    /* Toggle between adding and removing the "responsive" class to the navbar when the user clicks on the icon */
    const myFunction = () => {
        console.log("myFunction");
    };

    async function maybeDelete() {
        console.log("toolbar maybeDelete key", dbName, dbKey);
        const tgt = await db[dbName].get(dbKey);
        console.log("toolbar maybeDelete tgt", tgt);
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
        console.log(`doDelete: ${dbName} ${dbKey}`);
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            SK: dbKey,
            tgtName: tgtName,
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
    async function carAndDriverSSML(carNumber) {
        var rc = `<say-as interpret-as="characters" >${carNumber}</say-as>`;
        const ptcpFromDexie = await db.Participant.get(carNumber.toString());
        if (ptcpFromDexie) {
            const entityFactory = new EntityFactory({});
            var ptcpEntity = entityFactory.build(ptcpFromDexie);
            if (ptcpEntity.ssmlName) {
                rc += ` driven by ${ptcpEntity.ssmlName}`;
            }
        }
        return rc;
    }
    async function requestAnnouncement() {
        var announceText = "";
        var carsAndOrDrivers = ["", ""];

        for (var i = 0; i < cn.length; i++) {
            carsAndOrDrivers[i] = await carAndDriverSSML(cn[i]);
        }

        announceText = `Car ${carsAndOrDrivers[0]}, and car ${carsAndOrDrivers[1]}, please report to your cars, it is time to race.....`;
        announceText += `Car ${carsAndOrDrivers[0]}, and car ${carsAndOrDrivers[1]}, please report to your cars, it is time to race`;

        console.log(`doAnnounce: ${announceText} `);
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            paMessage: `<speak>${announceText}</speak>`,
        };

        axios.defaults.headers.common["Authorization"] = bearer;

        const endpoint = "/initiateAnnouncement";

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
                    text: `Announcement Requested.`,
                    type: "success",
                };
                announceText = "";
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
        console.log("routing to:", timerLink);
        push(timerLink);
    };
    const gotoBracket = () => {
        console.log("routing to bracket:", bracketLink);
        push(bracketLink);
    };
    function gotoHistory() {
        console.log("routing to history:");
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
    }

    /* Style the links inside the navigation bar */
    .navbarItem {
        float: left;
        display: block;
        color: #f2f2f2;
        text-align: center;
        padding: 14px 16px;
        text-decoration: none;
        font-size: 12px;
        width: 25%;
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
            Media
        </span>
    {/if}

    {#if window.location.href.includes('RsList/Pending') && isAnnounceAllowed()}
        <span
            class="navbarItem"
            style="background-color: {$theme}"
            on:click|preventDefault={requestAnnouncement}>
            Announce
        </span>
    {/if}
</div>
