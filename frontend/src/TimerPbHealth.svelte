<script>
    import log from "loglevel";
    import { Base64 } from "js-base64";
    import {
        Button,
        Collapse,
        Modal,
        ModalBody,
        ModalFooter,
        ModalHeader,
    } from "sveltestrap";
    import { tutorial as Timer } from "@rr1.us/timer_protobuf";
    import { onMount } from "svelte";
    import { statusMessage, raceConfig, axios } from "./stores";
    import { getTimerPbConfig } from "./utils.js";
    import TimerSubscribeStub from "./TimerSubscribeStub.svelte";

    export let timerName;
    export let timerId;
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

    onMount(() => {
        //params.timerName=uriDecode(params.timerName);
        //timerName=decodeURI(params.timerName)
        onMountAsync();
        const interval = setInterval(() => {
            rerenderStatusAge();
        }, 1000);

        return () => {
            const now = new Date().toLocaleTimeString();
            log.debug(`${now} pbhealth ${timerName} ondestroy: `, interval);
            clearInterval(interval);
        };
    });

    function rerenderStatusAge() {
        //log.debug(`rrs ${timerName}`,recentHealth,healthMs)
        if (recentHealth && healthMs) {
            recentHealth.ageSeconds = Math.floor(
                (new Date().getTime() - healthMs) / 1000
            );
            recentHealth.cpuIncrementingUptime =
                recentHealth.cpuUptime + recentHealth.ageSeconds;
            recentHealth = recentHealth;
        }
    }
    async function onMountAsync() {
        log.debug("TimerPbHealth TimerName:", timerName);
        [timerPbConfig] = await getTimerPbConfig(timerName);

        log.debug("TimerPbHealth dexie:", timerPbConfig);

        if (timerPbConfig && timerPbConfig.seq) {
            await getTimerHistory();
        }
    }
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
        //console.log(`showHealth tdl: ${tdl}`);
        //return

        for (let td of tdl.timerData) {
            if (td.timerHealth) {
                console.log(`thealth:`, td.timerHealth, "xmitMs", tdl.xmitMs);
                if (tdl.xmitMs && tdl.xmitMs > healthMs) {
                    healthMs = tdl.xmitMs;
                    recentHealth = td.timerHealth;
                    recentHealth.ageSeconds = Math.floor(
                        (new Date().getTime() - healthMs) / 1000
                    );
                    console.log(
                        `ageSeconds:`,
                        recentHealth.ageSeconds,
                        healthMs,
                        new Date().getTime()
                    );
                    recentHealth.cpuIncrementingUptime = recentHealth.cpuUptime;
                    recentHealth.tempFmt = `${R10(
                        recentHealth.cpuTempC
                    )}°C ${cToF(recentHealth.cpuTempC)}`;
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
    function secondsToHHMMSS(seconds) {
        var hoursLeft = Math.floor(seconds / 3600);
        var minLeft = Math.floor((seconds - hoursLeft * 3600) / 60);
        var secondsLeft = seconds - hoursLeft * 3600 - minLeft * 60;
        secondsLeft = Math.round(secondsLeft * 100) / 100;
        var answer = "";
        answer += hoursLeft < 10 ? "0" + hoursLeft : hoursLeft;
        answer += ":" + (minLeft < 10 ? "0" + minLeft : minLeft);
        answer += ":" + (secondsLeft < 10 ? "0" + secondsLeft : secondsLeft);
        return answer;
    }
    function cToF(x) {
        if (x) {
            const f = (9 / 5) * x + 32;
            return `${R10(f)}°F`;
        }
        return "";
    }
    function R100(x) {
        return (Math.round(x * 100) / 100).toFixed(2);
    }
    function R10(x) {
        return (Math.round(x * 10) / 10).toFixed(1);
    }
    function getUptimePct(recentHealth) {
        if (recentHealth.cpuUptime) {
            return `${R100(
                (recentHealth.gpsUptimeTotal / recentHealth.cpuUptime) * 100
            )}%`;
        } else {
            return "";
        }
    }
    function fmtGitHash() {
        if (recentHealth.versionStamp) {
            let dirty = "";
            if (recentHealth.gitDirty) {
                dirty = "(Dirty)";
            }
            const hash = recentHealth.versionStamp.toString(16);
            return `${hash}${dirty}`;
        } else {
            return "Unknown";
        }
    }
</script>

<div>
    {#key timerId}
        <TimerSubscribeStub
            {timerId}
            verbose=""
            on:timerDataList={(e) => {
                showHealth(e.detail);
            }}
        />
    {/key}
    <Button color={healthColor} on:click={toggle}>
        {healthText}
        {#if spinning}
            <img alt="spinner" src="data/circles.svg" width="25px" />
        {/if}
    </Button>
    <Collapse isOpen={open} {toggle}>
        <ul>
            <li>Timer Id: {timerId}</li>
            <li>
                Last Status: {secondsToHHMMSS(recentHealth.ageSeconds)} seconds ago
            </li>
            <li>CPU Temp: {recentHealth.tempFmt}</li>
            <li>
                CPU Uptime: {secondsToHHMMSS(
                    recentHealth.cpuIncrementingUptime
                )}
            </li>
            {#if recentHealth.gpsInitialAcquisitionSecondsAfterBoot}
                <li>
                    Gps Acquistion delay: {secondsToHHMMSS(
                        recentHealth.gpsInitialAcquisitionSecondsAfterBoot
                    )}
                </li>
                <li>
                    Gps Total Uptime: {secondsToHHMMSS(
                        recentHealth.gpsUptimeTotal
                    )}
                    ({getUptimePct(recentHealth)})
                </li>
                <li>
                    Gps Recent Uptime: {secondsToHHMMSS(
                        recentHealth.gpsUptimeContiguous
                    )}
                </li>
                <li>Gps Flutter: {recentHealth.gpsFlutter}</li>
                <li>Gps PPS: {recentHealth.gpsEmittingPps}</li>
            {:else}
                <li>Gps Not yet acquired</li>
            {/if}
            <li>Chrony PPS: {recentHealth.chronyUsingPps}</li>
            <li>Free Mem: {recentHealth.ramFreeKB} KB</li>
            <li>SSID: {recentHealth.ssid}</li>
            <li>IP: {recentHealth.wifiIP}</li>
            <li>Timer GitHash: {fmtGitHash()}</li>
            <li>OverlayFS: {recentHealth.overlayFsEnabled}</li>
        </ul>
    </Collapse>
</div>
