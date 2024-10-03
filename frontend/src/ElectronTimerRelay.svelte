<script>
    import log from "loglevel";
    import { onMount } from "svelte";
    import { axios, pushMessage, raceConfig } from "./stores.js";

    onMount(async () => {
        installTimerHook();
    });
    function installTimerHook() {
        var hookElement = document.getElementById("udpTimerSpan");
        hookElement.addEventListener("udpTimer", handleTimerEvent, false);
    }
    function handleTimerEvent(event) {
        log.debug("hooked:", event);
        log.debug("hooked detail:", event.detail);
        const timerResult = JSON.parse(event.detail);
        if (timerResult) {
            log.debug("hooked lane:", timerResult.lane);
            log.debug("hooked ms:", timerResult.ms);
            getNob(timerResult);
        }
    }
    async function postResult(timerResult, nextOnBlocks) {
        var phr = [];
        const winMicros = timerResult.ms * 1000;

        if (timerResult.lane === "1") {
            phr = [0, winMicros];
        } else if (timerResult.lane === "2") {
            phr = [winMicros, 0];
        } else {
            pushMessage( {
                text: `Invalid Timer Lane ${timerResult.lane}`,
                type: "error",
            });
            return;
        }
        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,

            SK: nextOnBlocks.SK,

            phr: phr,
        };
        const endPoint = "/doApplyFinishTime";
        try {
            const response = await $axios.post(
                $raceConfig.baseUrl + endPoint,
                req
            );
            if (response.data.error) {
                log.debug("Timer post failed", response);
                pushMessage( {
                    text: response.data.error,
                    type: "error",
                });
            } else {
                log.debug(endPoint + " axios success");
                pushMessage( {
                    text: "Winning Time applied!",
                });
            }
        } catch (err) {
            log.debug(endPoint + " failed: " + err);
        }
    }
    async function getNob(timerResult) {
        const getNextOnBlocksUrl =
            $raceConfig.baseUrl +
            "/getNextOnBlocks?orgId=" +
            $raceConfig.orgId +
            "&orgIz=" +
            $raceConfig.orgIz;
        const onBlocksResponse = await $axios.get(getNextOnBlocksUrl);
        const data = onBlocksResponse.data;
        log.debug("nextOnBlock:", data);
        if (data && data.length > 0) {
            await postResult(timerResult, data[0]);
        }
    }
</script>

<span id="udpTimerSpan" />
