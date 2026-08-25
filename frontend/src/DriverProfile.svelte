<script>
    import log from "loglevel";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import { axios, raceConfig, pushMessage, userEmail } from "./stores.js";
    import SpinnerButton from "./SpinnerButton.svelte";
    import SpotifyEmbedded from "./SpotifyEmbedded.svelte";

    const EntityFactory = require("../../backend/modules/lambdaDerby/src/shared/EntityFactory.js");

    export let params = {};

    let ptcp = null;
    let wLink = "";
    let saveSpinning = false;
    let mounted = false;

    onMount(async () => {
        ptcp = await db.Participant.get(params.number.toString());
        wLink = ptcp ? ptcp.wLink || "" : "";
        mounted = true;
    });

    // UX only -- the server independently checks maintainerHashes on every
    // save. A stale or tampered client-side check here can't grant a write
    // it wouldn't otherwise be allowed.
    $: myHash = $userEmail
        ? new EntityFactory({}).getHashFromEmail($userEmail)
        : "";
    $: isMaintainer =
        ptcp && Array.from(ptcp.maintainerHashes || []).includes(myHash);

    async function save() {
        saveSpinning = true;
        try {
            await $axios.post($raceConfig.baseUrl + "/updateDriverWalkup", {
                orgId: $raceConfig.orgId,
                orgIz: $raceConfig.orgIz,
                number: params.number,
                wLink,
            });
            pushMessage({ text: "Walkup track saved.", type: "success" });
            ptcp = await db.Participant.get(params.number.toString());
        } catch (err) {
            log.error("DriverProfile: save failed", err);
            pushMessage({
                text: "Unable to save walkup track.",
                type: "error",
            });
        } finally {
            saveSpinning = false;
        }
    }
</script>

{#if !mounted}
    <SpinnerButton disabled spinning>Loading</SpinnerButton>
{:else if !ptcp}
    <p>Driver #{params.number} not found at this event.</p>
{:else if !$userEmail}
    <p>Log in to edit driver #{params.number}'s walkup track.</p>
    <a href="#/loginH">Log in</a>
{:else if !isMaintainer}
    <p>
        You don't currently maintain driver #{params.number}'s walkup track.
    </p>
{:else}
    <h3>#{ptcp.number} {ptcp.name} -- Walkup Track</h3>
    <label>
        Spotify Link:
        <input
            type="text"
            bind:value={wLink}
            placeholder="https://open.spotify.com/track/..."
        />
    </label>
    <br />
    <SpinnerButton spinning={saveSpinning} on:click={save}>Save</SpinnerButton>
    {#if wLink}
        <SpotifyEmbedded href={wLink} />
    {/if}
{/if}
