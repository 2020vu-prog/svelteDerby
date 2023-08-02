<script>
    // helper to use utils subscribe. needed b/c destroy must happen on initial load, not after async lookup!
    import log from "loglevel";
    const { v4: uuidv4 } = require("uuid");
    import { Base64 } from "js-base64";
    import { tutorial as Timer } from "@rr1.us/timer_protobuf";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import { createEventDispatcher } from "svelte";
    import { getTimerPbConfig, MqttMapSubscription } from "./utils.js";
    import { mqttMapData } from "./stores.js";
    export let timerId = "";
    let timerTopic = "";
    const dispatch = createEventDispatcher();
    if (timerId) {
        timerTopic = `rr1Timer/${timerId}`;
        log.debug("handleTimerSelect MqttMapSubscription:", timerId);
        MqttMapSubscription(timerTopic);
    }
    /*
    onMount(async () => {
        log.debug("handleTimerSelect TimerSS mounted:",timerId)

    });
    $: log.debug("handleTimerSelect TimerSS changed:",timerId)
    */
    $: {
        syncPbState($mqttMapData);
    }
    let prevB64 = "";
    function syncPbState() {
        log.debug(`syncPbState. topic: [${timerTopic}]`);
        if (timerTopic && $mqttMapData[timerTopic]) {
            const msg = $mqttMapData[timerTopic];
            if (!msg) {
                return;
            }
            if (msg.b64 == prevB64) {
                return;
            }
            prevB64 = msg.b64;
            log.debug(`syncPbState. json:`, msg);
            const tdlBinary = Base64.toUint8Array(msg.b64);
            const tdl = Timer.TimerDataList.decode(tdlBinary);
            log.debug(`syncPbState. tdl:`, tdl);
            dispatch("timerDataList", tdl);
            vCap(tdl);
        }
    }
    function vCap(tdl) {
        for (let td of tdl.timerData) {
            log.debug("stub td:", td);
            if (td.timerHealth) {
            }
            if (td.timerPin) {
                var timerKey;
                if (td.timerPin.stamp) {
                    timerKey = "MQTT-" + td.timerPin.stamp.tick64;
                } else {
                    timerKey = "MQTT-" + uuidv4();
                }
                if (
                    td.timerPin.pinName == Timer.PinName.lane1 ||
                    td.timerPin.pinName == Timer.PinName.lane2
                ) {
                    if (td.timerPin.pinState == Timer.PinState.BLOCKED) {
                        if (!shouldThrottle()) {
                            log.debug("stub td triggering:", timerKey);
                            //$mqttTriggerVideoCapture = timerKey;
                            dispatch("videoKey", timerKey);
                        }
                    }
                }
            }
        }
    }
    /*
    Only request capture once every 15 seconds...
    * safety valve for flickering photoeye.
    * capture on first transition of finish only.  
    */
    var recentCapture = 0;
    function shouldThrottle() {
        const now = new Date().getTime();
        if (recentCapture + 15000 > now) {
            return true;
        }
        recentCapture = now;
        return false;
    }
</script>
Id: {timerId}
