<script>
    export let text = "";
</script>

{#if text}
    <div>
        <code style="background-color:#bbb;">
            {text}
        </code>
    </div>
{/if}
