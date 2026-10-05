<script>
    import { cx } from "./cx.js";

    // The inputs this app uses: text, number, select and checkbox. `type` has to
    // be static on each element for Svelte's `bind:value` / `bind:checked`, so
    // each type gets its own branch.
    let className = "";
    export { className as class };
    export let type = "text";
    export let value = "";
    export let checked = false;
    export let placeholder = "";
    export let disabled = undefined;

    $: if (!["text", "number", "select", "checkbox"].includes(type)) {
        console.error(`ui/Input: unsupported type "${type}"`);
    }
</script>

{#if type === "text"}
    <input
        {...$$restProps}
        type="text"
        class={cx(className, "form-control")}
        bind:value
        placeholder={placeholder}
        disabled={disabled}
        on:input
        on:change
        on:blur
        on:focus
    />
{:else if type === "number"}
    <input
        {...$$restProps}
        type="number"
        class={cx(className, "form-control")}
        bind:value
        placeholder={placeholder}
        disabled={disabled}
        on:input
        on:change
        on:blur
        on:focus
    />
{:else if type === "select"}
    <select
        {...$$restProps}
        class={cx(className, "form-control")}
        bind:value
        disabled={disabled}
        on:change
        on:blur
        on:focus
    >
        <slot />
    </select>
{:else if type === "checkbox"}
    <input
        {...$$restProps}
        type="checkbox"
        class={cx(className, "form-check-input")}
        bind:checked
        disabled={disabled}
        on:change
        on:blur
        on:focus
    />
{/if}
