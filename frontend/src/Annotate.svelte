<script>
    export let text = "";
</script>

<style>
    .annotation {
        background-color: #fff3cd;
        border: 1px solid #b68200;
        color: #3d2b00;
        display: inline-block;
        font-family: inherit;
        font-size: 1.25rem;
        font-weight: 600;
        line-height: 1.2;
        padding: 0.12rem 0.35rem;
    }
</style>

{#if text}
    <div>
        <span class="annotation">{text}</span>
    </div>
{/if}
