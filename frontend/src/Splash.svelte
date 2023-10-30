<script>
    import log from "loglevel";
    import { Modal, ModalHeader, ModalBody } from "sveltestrap";
    import { onMount } from "svelte";
    import { lastSplash } from "./stores.js";
    const frequency = 3600 * 1000 * 8;
    function overDue() {
        const now = new Date().getTime();
        const rc = now > $lastSplash + frequency;
        if (rc) {
            $lastSplash = now;
        }
        return rc;
    }
    let open = overDue();
    let fullscreen = true;
    const toggle = () => (open = !open);
    onMount(() => {
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
