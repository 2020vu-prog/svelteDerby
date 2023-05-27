<script>
    import log from "loglevel";
    import {
        Button,
        Collapse,
        Modal,
        ModalBody,
        ModalFooter,
        ModalHeader,
    } from "sveltestrap";
    import { tutorial as Timer } from "./generated/timer_pb.js";
    import { onMount } from "svelte";
    import { statusMessage, raceConfig, axios } from "./stores";
    import { getTimerPbConfig } from "./utils.js";

    export let timerName;
    var historyList = [];
    let healthColor = "info";
    let healthMs = 0;
    let spinning = true;
    let recentHealth = {};
    const satelliteEmoji = "🛰️";
    const errorEmoji = "️⛔";
    const unknownEmoji = "️❓";
    const heartbeatEmoji = "️💓";
    const healthTextBase = "Health ";
    const healthTextDefault = healthTextBase + unknownEmoji;
    let healthText = healthTextDefault;
    let open = false;
    var timerPbConfig = {};
    const toggle = () => (open = !open);
    onMount(async () => {
        //params.timerName=uriDecode(params.timerName);
        //timerName=decodeURI(params.timerName)
        log.debug("TimerPbHealth TimerName:", timerName);
        [timerPbConfig] = await getTimerPbConfig(timerName);

        log.debug("TimerPbHealth dexie:", timerPbConfig);
        if (timerPbConfig && timerPbConfig.seq) {
            await getTimerHistory();
        }
    });
    async function getTimerHistory() {
        log.debug("getTimerHistory:");
        //await sleep(3000)

        const orgIz = $raceConfig.orgIz;
        const orgId = $raceConfig.orgId;
        //const lowMS = 1000 * 3600 * 720;
        const lowMS = 1000 * 3600 * 0.05;
        const loIso = new Date(new Date().getTime() - lowMS).toISOString();
        const url = `/getTimerPbHistory?orgIz=${orgIz}&orgId=${orgId}&timerName=${timerPbConfig.timerMqttClientId}&loIso=${loIso}`;
        try {
            const response = await $axios.get($raceConfig.baseUrl + url);
            spinning = false;
            if (response.error) {
                log.debug("getTimerHistory:", response);
                //TODO: not working!?
                $statusMessage = {
                    text: `getTimerHistory Failed: ${response.error}.`,
                    type: "error",
                };
            } else {
                /*
                $statusMessage = {
                    text: `getTimerHistory Complete.`,
                    type: "success",
                };
                */

                historyList = response.data;
                log.debug("getTimerHistory: ", historyList);
                if (historyList && historyList.length > 0) {
                    for (let h of historyList) {
                        if (h && h.data) {
                        } else {
                            continue;
                        }
                        const buf = h.data;
                        //log.debug("getTimerHistory h: ", h.SK," buf:",buf);
                        const buf8 = buf.data;

                        //log.debug("getTimerHistory h: ", h.SK," buf8:",buf8);
                        if (h.SK.startsWith("9999:")) {
                            const c = Timer.TimerConfig.decode(buf8);
                            log.debug("getTimerPbConfig: 2:", c);
                        } else {
                            const c = Timer.TimerDataList.decode(buf8);
                            //log.debug("getTimerDataList: 2:", c);
                            showHealth(c);
                        }
                    }
                }
            }
        } catch (err) {
            log.error("getTimerHistory error: ", err);
            $statusMessage = {
                text: "getTimerHistory error: " + err,
                type: "error",
            };
        }
    }
    function showHealth(tdl) {
        //console.log(`tdl: ${tdl}`)
        //return

        for (let td of tdl.timerData) {
            if (td.timerHealth) {
                console.log(`thealth:`, td.timerHealth);
                if (tdl.xmitMs && tdl.xmitMs > healthMs) {
                    healthMs = tdl.xmitMs;
                    recentHealth = td.timerHealth;
                    recentHealth.ageSeconds = Math.floor(
                        (new Date().getTime() - healthMs) / 1000
                    );
                    recentHealth.tempFmt = `${R100(recentHealth.cpuTempC)}°C`;
                    healthText = healthTextDefault;
                    if (recentHealth.ageSeconds > 72) {
                        healthColor = "danger";
                        healthText = healthTextBase + errorEmoji;
                    } else {
                        healthColor = "success";
                        healthText = healthTextBase + heartbeatEmoji;
                        if (recentHealth.gpsEmittingPps) {
                            healthText += satelliteEmoji;
                        }
                    }
                }
            }
        }
    }
    function R100(x) {
        return Math.round(x * 100) / 100;
    }
</script>

<div>
    <Button color={healthColor} on:click={toggle}>
        {healthText}
        {#if spinning}
            <img alt="spinner" src="data/circles.svg" width="25px" />
        {/if}
    </Button>
    <Collapse isOpen={open} {toggle}>

        <ul>
            <li>Last Status: {recentHealth.ageSeconds} seconds ago</li>
            <li>CPU Temp: {recentHealth.tempFmt}</li>
            <li>Uptime: {R100(recentHealth.cpuUptime / 60)} minutes</li>
            <li>Gps PPS: {recentHealth.gpsEmittingPps}</li>
            <li>Chrony PPS: {recentHealth.chronyUsingPps}</li>
            <li>Free Mem: {recentHealth.ramFreeKB} KB</li>
            <li>SSID: {recentHealth.ssid}</li>
        </ul>

    </Collapse>
</div>
