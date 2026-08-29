<script>
    import log from "loglevel";
    import {
        axios,
        raceConfig,
        pushMessage,
        userEmail,
        driverMap,
    } from "./stores.js";
    import SpinnerButton from "./SpinnerButton.svelte";
    import WalkupLink from "./WalkupLink.svelte";

    const EntityFactory = require("../../backend/modules/lambdaDerby/src/shared/EntityFactory.js");

    export let params = {};

    let wLink = "";
    let wLinkInitializedForNumber;
    let saveSpinning = false;

    // Reactive, not a one-time fetch: $driverMap already syncs live over the
    // app's existing realtime/HTTP pipeline (see $driverMap in
    // HotLoad.svelte), the same source DriverProfileList.svelte already
    // reads. A one-time db.Participant.get() here would freeze isMaintainer
    // at whatever it was on mount, so a staff revoke landing mid-session
    // wouldn't take the editable form away until the page was reloaded --
    // the server would still reject the save, but the UI would keep
    // inviting one.
    $: ptcp =
        params.number != null
            ? $driverMap[params.number.toString()] || null
            : null;

    // Only seed the input once per driver, not on every store update --
    // otherwise an unrelated sync (e.g. staff editing the sponsor) while
    // the maintainer is mid-edit would clobber whatever they've typed and
    // not yet saved.
    $: if (ptcp && wLinkInitializedForNumber !== ptcp.number) {
        wLink = ptcp.wLink || "";
        wLinkInitializedForNumber = ptcp.number;
    }

    // UX only -- the server independently checks maintainerHashes on every
    // save. A stale or tampered client-side check here can't grant a write
    // it wouldn't otherwise be allowed.
    $: myHash = $userEmail
        ? new EntityFactory({}).getHashFromEmail($userEmail)
        : "";
    $: isMaintainer = ptcp && (ptcp.maintainerHashes || []).includes(myHash);

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

{#if !ptcp}
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
    <WalkupLink bind:saveValue={wLink} let:valid>
        <SpinnerButton
            disabled={!valid}
            spinning={saveSpinning}
            on:click={save}>Save</SpinnerButton
        >
    </WalkupLink>
{/if}
