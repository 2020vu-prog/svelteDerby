<script>
    import log from "loglevel";
    import { replace } from "svelte-spa-router";
    import { onMount } from "svelte";
    import SpinnerButton from "./SpinnerButton.svelte";
    import {
        axios,
        raceConfig,
        pushMessage,
        userEmail,
        initialReloadRoute,
    } from "./stores.js";

    export let params = {};

    let status = "loading"; // loading | valid | invalid | claiming | claimed
    let previewNumber = "";
    let claimSpinning = false;

    onMount(async () => {
        await refreshPreview();
    });

    async function refreshPreview() {
        status = "loading";
        try {
            const response = await $axios.get(
                $raceConfig.baseUrl + "/getDriverDelegationToken",
                {
                    params: { orgId: params.orgId, token: params.token },
                }
            );
            if (response.data && response.data.valid) {
                previewNumber = response.data.number;
                status = "valid";
            } else {
                status = "invalid";
            }
        } catch (err) {
            log.error("DriverDelegate: preview failed", err);
            status = "invalid";
        }
    }

    function goLogin() {
        $initialReloadRoute = `/driverDelegate/${params.orgId}/${params.token}`;
        replace("/loginH");
    }

    async function claim() {
        claimSpinning = true;
        try {
            const response = await $axios.post(
                $raceConfig.baseUrl + "/claimDriverDelegation",
                { orgId: params.orgId, token: params.token }
            );
            status = "claimed";
            pushMessage({
                text: `You can now maintain driver #${response.data.number}'s walkup track.`,
                type: "success",
            });
            replace(`/driverProfile/${response.data.number}`);
        } catch (err) {
            log.error("DriverDelegate: claim failed", err);
            pushMessage({
                text: "Unable to claim this delegation. It may have expired or already been used.",
                type: "error",
            });
            await refreshPreview();
        } finally {
            claimSpinning = false;
        }
    }
</script>

<h3>Maintain a Walkup Track</h3>

{#if status === "loading"}
    <SpinnerButton disabled spinning>Checking link</SpinnerButton>
{:else if status === "invalid"}
    <p>
        This link is invalid, expired, or has already been used. Ask staff
        for a new one.
    </p>
{:else if status === "valid" || status === "claiming" || status === "claimed"}
    <p>Claim access to maintain driver #{previewNumber}'s walkup track.</p>
    {#if !$userEmail}
        <p>You'll need to log in first.</p>
        <SpinnerButton on:click={goLogin}>Log in to claim</SpinnerButton>
    {:else}
        <SpinnerButton spinning={claimSpinning} on:click={claim}>
            Claim
        </SpinnerButton>
    {/if}
{/if}
