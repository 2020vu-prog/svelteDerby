<script>
    // helper to use utils subscribe. needed b/c destroy must happen on initial load, not after async lookup!
    import log from "loglevel";
    const { v4: uuidv4 } = require("uuid");
    import { Base64 } from "js-base64";
    import { onMount } from "svelte";
    import { db } from "#src/eventDb.js";
    import { MqttMapSubscription } from "#src/utils.js";
    import { mqttMapData } from "#src/stores.js";
    export let mqTopic = "";
    export let verbose = "truthyString";
    // Called with each message that arrives on `mqTopic`.
    export let onMqMessage = () => {};
    if (mqTopic) {
        log.debug("MqttSubscribeStub:", mqTopic);
        MqttMapSubscription(mqTopic);
    }
    $: {
        dispatchMsg($mqttMapData);
    }
    function dispatchMsg() {
        log.debug(`dispatchMsg. topic: [${mqTopic}]`);
        if (mqTopic && $mqttMapData[mqTopic]) {
            const msg = $mqttMapData[mqTopic];
            if (!msg) {
                return;
            }
            log.debug(
                `dispatchMsg. topic: [${mqTopic}] msg: [${JSON.stringify(msg)}]`
            );
            onMqMessage(msg);
        }
    }
</script>
{#if verbose}
    Id: {mqTopic}
{/if}
