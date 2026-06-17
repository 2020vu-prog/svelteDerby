<script>
    export let text = "";
</script>

{#if text}
    <div>
        <code style="background-color:#bbb; font-size: 1.6rem;">
            {text}
        </code>
    </div>
{/if}
