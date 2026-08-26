<script>
    import { push, replace } from "svelte-spa-router";
    import { driverMap, userEmail, raceConfig } from "./stores.js";

    const EntityFactory = require("../../backend/modules/lambdaDerby/src/shared/EntityFactory.js");

    // No backend call: maintainerHashes already syncs onto every Participant
    // record through the app's existing realtime/HTTP pipeline (see
    // $driverMap in HotLoad.svelte), and getHashFromEmail() already runs in
    // the browser (crypto-browserify is wired into the webpack build), so
    // "which drivers can I edit" is a local filter, not an API call.
    $: myHash = $userEmail
        ? new EntityFactory({}).getHashFromEmail($userEmail)
        : "";
    $: myDrivers = myHash
        ? Object.values($driverMap).filter((ptcp) =>
              Array.from(ptcp.maintainerHashes || []).includes(myHash)
          )
        : [];
</script>

<h3>My Drivers</h3>

{#if !$userEmail}
    <p>Log in to see any driver walkup tracks delegated to you.</p>
    <a href="#/loginH">Log in</a>
{:else if myDrivers.length === 0}
    <p>
        Nothing has been delegated to you at this event yet. Ask a staff member
        to send you a QR code from the driver's entry.
    </p>
{:else}
    <ul>
        {#each myDrivers as ptcp (ptcp.number)}
            <li>
                <a href="#/driverProfile/{ptcp.number}">
                    #{ptcp.number}
                    {ptcp.name}
                </a>
            </li>
        {/each}
    </ul>
{/if}
