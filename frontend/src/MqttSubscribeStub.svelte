<script>
    // helper to use utils subscribe. needed b/c destroy must happen on initial load, not after async lookup!
    import log from "loglevel";
    const { v4: uuidv4 } = require("uuid");
    import { Base64 } from "js-base64";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import { createEventDispatcher } from "svelte";
    import { MqttMapSubscription } from "./utils.js";
    import { mqttMapData } from "./stores.js";
    export let mqTopic = "";
    export let verbose = "truthyString";
    const dispatch = createEventDispatcher();
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
        log.debug(`dispatchMsg. topic: [${mqTopic}] msg: [${JSON.stringify(msg)}]`);
            dispatch("mqMessage", msg);
        }
    }
</script>
{#if verbose}
    Id: {mqTopic}
{/if}
