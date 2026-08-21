<script>
    export let lane;
    export let carNumber;
    export let participant;
    export let statuses = [];
    export let isWinner = false;

    $: displayNumber = carNumber ?? "";
    $: displayName = participant?.name || "";
    $: displayPhoneticName =
        participant?.phoneticName || participant?.pName || "";
    $: displaySponsor = participant?.spon || "";
    $: displayNotes = participant?.notes || "";
    $: ariaLabel = displayNumber
        ? `Lane ${lane}: car ${displayNumber}`
        : `Lane ${lane}`;
</script>

<article class="driver-card" aria-label={ariaLabel}>
    <div class="lane-label">Lane {lane}</div>
    <div class="driver-heading">
        {#if isWinner}
            <img
                class="winner-flag"
                alt="Winner"
                src="data/checkered-flag-svgrepo-com.svg"
            />
        {/if}
        {#if displayNumber}
            <span class="car-number">{displayNumber}</span>
        {/if}
        {#if displayName}
            <span class="driver-name">{displayName}</span>
        {/if}
    </div>
    {#if displaySponsor}
        <div class="sponsor">{displaySponsor}</div>
    {/if}
    {#if displayNotes}
        <div class="notes">{displayNotes}</div>
    {/if}
    {#if statuses.length}
        <div class="statuses" aria-label="Race status">
            {#each statuses as status}
                <span class:winner={status.winner} class="status-badge">
                    {status.label}
                </span>
            {/each}
        </div>
    {/if}
    {#if displayPhoneticName}
        <div class="phonetic-name">
            <span class="field-label">Pronunciation:</span>
            {displayPhoneticName}
        </div>
    {/if}
</article>

<style>
    .driver-card {
        background: white;
        border: 2px solid #17a2b8;
        border-radius: 0.4rem;
        display: flex;
        flex-direction: column;
        min-height: 13rem;
        padding: 1rem;
    }

    .lane-label {
        color: #555;
        font-size: 0.9rem;
        font-weight: 700;
        text-transform: uppercase;
    }

    .driver-heading {
        align-items: baseline;
        display: flex;
        gap: 0.75rem;
        margin-top: 0.35rem;
    }

    .car-number {
        font-size: clamp(2rem, 5vw, 3.5rem);
        font-weight: 800;
        line-height: 1;
    }

    .winner-flag {
        height: 2rem;
        width: 2rem;
    }

    .driver-name {
        font-size: clamp(1.25rem, 3vw, 2rem);
        font-weight: 700;
        overflow-wrap: anywhere;
    }

    .sponsor {
        font-size: 1.1rem;
        font-weight: 700;
        margin-top: 0.75rem;
    }

    .phonetic-name {
        color: #444;
        font-style: italic;
        margin-top: 0.5rem;
        overflow-wrap: anywhere;
    }

    .field-label {
        font-style: normal;
        font-weight: 700;
        margin-right: 0.35rem;
    }

    .notes {
        color: #444;
        flex: 1;
        margin-top: 0.5rem;
        overflow-wrap: anywhere;
        white-space: pre-wrap;
    }

    .statuses {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
        margin-top: 0.75rem;
    }

    .status-badge {
        background: #6c757d;
        border-radius: 999px;
        color: white;
        font-size: 1rem;
        font-weight: 700;
        padding: 0.25rem 0.65rem;
    }

    .status-badge.winner {
        background: #28a745;
    }
</style>
