<script>
    /** Route that the current user was denied access to. */
    export let routePath = "";
</script>

<section class="permission-denied" aria-live="polite">
    <h1>Permission required</h1>
    <p>You do not have permission to view this screen.</p>
    {#if routePath}
        <p class="route-path">{routePath}</p>
    {/if}
</section>

<style>
    .permission-denied {
        margin: 2rem auto;
        max-width: 36rem;
        padding: 1rem;
        text-align: center;
    }

    .route-path {
        color: #666;
        font-size: 0.85rem;
    }
</style>
