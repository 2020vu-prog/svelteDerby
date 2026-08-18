<script>
    import log from "loglevel";
    import { Modal, ModalHeader, ModalBody } from "sveltestrap";
    import { onMount } from "svelte";
    import { lastSplash } from "./stores.js";
    import { end, toSeconds, parse } from "iso8601-duration";

    function overDue() {
        const now = Date.now();
        const nextShownMs = toSeconds(parse("PT8H")) * 1000;
        const rc = now > $lastSplash + nextShownMs;
        if (rc) {
            $lastSplash = now;
        }
        return rc;
    }
    let open = overDue();
    let fullscreen = true;
    const toggle = () => (open = !open);
    onMount(() => {
        setTimeout(() => {
            open = false;
        }, 10000);
        //open=true
    });
</script>

{#if open}
    <Modal isOpen={open} {toggle}>
        <ModalHeader {toggle}>
            RR1.US is the Official Timer App of NDR!
        </ModalHeader>
        <ModalBody>
            <a href="https://ndr.org"><img src="ndr.webp" alt="NDR" /></a>
        </ModalBody>
    </Modal>
{/if}
