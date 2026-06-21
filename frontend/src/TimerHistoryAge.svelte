<script>
    import { createEventDispatcher } from "svelte";
    import SpinnerButton from "./SpinnerButton.svelte";

    export let beginAgeDuration = "PT20M";
    export let endAgeDuration = "PT0S";
    export let spinning = false;

    const dispatch = createEventDispatcher();
    let showAge = false;
</script>

<span
    class="ageToggle"
    on:click={() => {
        showAge = !showAge;
    }}>⚙️</span
>
{#if showAge}
    <div class="ageControls">
        <label>
            End Age:
            <input
                type="text"
                bind:value={endAgeDuration}
                placeholder="HistoryEndAge"
            />
        </label>
        <label>
            Begin Age:
            <input
                type="text"
                bind:value={beginAgeDuration}
                placeholder="HistoryAge"
            />
        </label>
        <SpinnerButton
            on:click={() => {
                dispatch("refresh");
            }}
            {spinning}
        >
            Get History
        </SpinnerButton>
    </div>
{/if}

<style>
    .ageToggle {
        cursor: pointer;
    }

    .ageControls {
        margin-top: 0.5rem;
    }

    label {
        display: block;
        margin-bottom: 0.5rem;
    }
</style>
