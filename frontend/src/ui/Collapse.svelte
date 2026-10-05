<script>
    import { slide } from "svelte/transition";

    let className = "";
    export { className as class };
    export let isOpen = false;
</script>

{#if isOpen}
    <div
        style="overflow: hidden;"
        {...$$restProps}
        class={className}
        transition:slide
    >
        <slot />
    </div>
{/if}
