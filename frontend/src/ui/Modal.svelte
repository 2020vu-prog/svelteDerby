<script context="module">
    let openCount = 0;
</script>

<script>
    import { onDestroy } from "svelte";
    import { fade } from "svelte/transition";

    export let isOpen = false;
    export let toggle = undefined;

    // `modal-open` on <body> stops the page behind the modal from scrolling; it
    // stays on until the last open modal closes.
    let counted = false;
    $: setCounted(isOpen);
    function setCounted(open) {
        if (open === counted) {
            return;
        }
        counted = open;
        openCount = Math.max(0, openCount + (open ? 1 : -1));
        document.body.classList.toggle("modal-open", openCount > 0);
        if (open) {
            trigger = document.activeElement;
        }
    }

    // Keyboard users keep their place: remember what had focus when the modal
    // opened, move focus into the dialog, and give it back once the modal is gone
    // (after the fade-out, or straight away if the whole component is removed).
    let trigger = null;
    function focusDialog(node) {
        node.focus();
    }
    function restoreFocus() {
        if (trigger && typeof trigger.focus === "function") {
            trigger.focus();
        }
        trigger = null;
    }
    onDestroy(() => {
        setCounted(false);
        restoreFocus();
    });

    let mouseDownTarget;
    function handleBackdropMouseDown(event) {
        mouseDownTarget = event.target;
    }
    function handleBackdropClick(event) {
        // Only a click that started and ended on the dim area closes the modal,
        // not a text selection dragged out of the dialog.
        if (
            event.target === event.currentTarget &&
            event.target === mouseDownTarget &&
            typeof toggle === "function"
        ) {
            toggle(event);
        }
    }
    function handleKeydown(event) {
        if (isOpen && event.key === "Escape" && typeof toggle === "function") {
            toggle(event);
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
    <div tabindex="-1">
        <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
        <div
            class="modal show d-block"
            role="dialog"
            aria-modal="true"
            tabindex="-1"
            use:focusDialog
            transition:fade={{ duration: 300 }}
            on:outroend={restoreFocus}
            on:mousedown={handleBackdropMouseDown}
            on:click={handleBackdropClick}
        >
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <slot />
                </div>
            </div>
        </div>
        <div
            class="modal-backdrop show"
            transition:fade={{ duration: 150 }}
        ></div>
    </div>
{/if}
