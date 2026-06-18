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
    import { pushMessage, raceConfig, axios } from "./stores";
    import {
        getTimerPbConfig,
        MqttIsClientEsp32,
        secondsToHHMMSS,
        protobufLongToNumber,
    } from "./utils.js";
    import TimerSubscribeStub from "./TimerSubscribeStub.svelte";
    import LogList from "./LogList.svelte";

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

            recentHealth = recentHealth;
            buildMsgs(recentHealth);
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
                pushMessage( {
                    text: `getTimerHistory Failed: ${response.error}.`,
                    type: "error",
                });
            } else {

                historyList = response.data;
                log.debug("getTimerHistory: ", historyList);
                if (historyList && historyList.length > 0) {
                    for (let h of historyList) {
                        if (h && h.data64) {
                        } else {
                            continue;
                        }

                        //const buf = h.data;
                        //log.debug("getTimerHistory h: ", h.SK," buf:",buf);
                        //const buf8 = buf.data;
                        const buf8=Buffer.from(h.data64, 'base64')

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
            pushMessage( {
                text: "getTimerHistory error: " + err,
                type: "error",
            });
        }
    }
    function showHealth(tdl) {
        //console.log(`showHealth tdl: ${tdl}`);
        //return

        for (let td of tdl.timerData) {
            if (td.timerHealth) {
                console.log(`thealth:`, td.timerHealth, "xmitMs", tdl.xmitMs);
                const xmitMs = protobufLongToNumber(tdl.xmitMs);
                if (xmitMs && xmitMs > healthMs) {
                    healthMs = xmitMs;
                    recentHealth = td.timerHealth;
                    recentHealth.tempFmt = `${R10(
                        recentHealth.cpuTempC
                    )}°C ${cToF(recentHealth.cpuTempC)}`;
                    rerenderStatusAge();
                }
            }
        }
        buildMsgs(recentHealth)
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
    function fmtVersionStamp() {
        if (recentHealth.buildEpoch) {
            return new Date(protobufLongToNumber(recentHealth.buildEpoch) * 1000).toLocaleString();
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
    let msgs=[]
    function msgCpuTemp(msgs,recentHealth){
        let ll=log.levels.ERROR
        if(recentHealth.cpuTempC <60){
            ll= log.levels.WARN
        }
        if(recentHealth.cpuTempC <50){
            ll= log.levels.INFO
        }
        msgs.push({msg: `CPU Temp: ${recentHealth.tempFmt}`,level: ll})
    }
    function msgFsOverlay(msgs,recentHealth){
        if (MqttIsClientEsp32(timerId)) {
            return;
        }
        const ll=recentHealth.overlayFsEnabled?log.levels.INFO:log.levels.WARN
        msgs.push({msg: `OverlayFS: ${recentHealth.overlayFsEnabled}`,level: ll})

    }

    function msgChronyPPS(msgs,recentHealth){
        if (MqttIsClientEsp32(timerId)) {
            return;
        }

        const ll=recentHealth.chronyUsingPps?log.levels.DEBUG:log.levels.ERROR
        msgs.push({msg: `Chrony PPS: ${recentHealth.chronyUsingPps}`,level: ll})
    }
    function msgCpuIdle(msgs,recentHealth){
        if(undefined === recentHealth.cpuIdlePercent){
            return
        }
        const cpuLoad=100 - recentHealth.cpuIdlePercent
        const ll=cpuLoad<25?log.levels.DEBUG:log.levels.WARN

        msgs.push({msg: `CPU Load: ${cpuLoad}%`,level: ll})

    }

    function msgGpsAll(msgs,recentHealth){

        msgs.push({msg:`GPS enabled: ${timerPbConfig.useGpsTime }`,level: log.levels.INFO})
        let ll=log.levels.DEBUG
        if(timerPbConfig.useGpsTime){
            ll=log.levels.INFO
        }
        if (recentHealth.gpsInitialAcquisitionSecondsAfterBoot){
            msgs.push({msg: `Gps Acquistion delay: ${secondsToHHMMSS(recentHealth.gpsInitialAcquisitionSecondsAfterBoot)}`,level: ll})
            const m=`Gps Total Uptime: ${secondsToHHMMSS(
                        recentHealth.gpsUptimeTotal
                    )}
                    (${getUptimePct(recentHealth)})
                    `
            msgs.push({msg: m,level: ll})
            msgs.push({msg: `Gps Recent Uptime: ${secondsToHHMMSS(recentHealth.gpsUptimeContiguous)}`,level: ll})
            msgs.push({msg: `Gps Flutter: ${recentHealth.gpsFlutter}`,level: ll})
            msgs.push({msg: `Gps PPS: ${recentHealth.gpsEmittingPps}`,level: ll})
        }else{
            if(timerPbConfig.useGpsTime){
                msgs.push({msg: `Gps Not yet acquired`,level: log.levels.ERROR})
            }else{
                msgs.push({msg: `Gps Not yet acquired`,level: log.levels.INFO})

            }
        }
    }
    function buildMsgs(recentHealth){
        msgs=[]
        msgs.push({msg: `Timer Id: ${timerId}`,level: log.levels.INFO})
        msgs.push({msg: `Last Status: ${secondsToHHMMSS(recentHealth.ageSeconds)} seconds ago`,level: log.levels.INFO})
        msgCpuTemp(msgs,recentHealth)
        const m=`CPU Uptime: ${secondsToHHMMSS( recentHealth.cpuIncrementingUptime)}`
        msgs.push({msg: m,level: log.levels.INFO})
        msgCpuIdle(msgs,recentHealth)



        msgGpsAll(msgs,recentHealth)
        msgChronyPPS(msgs,recentHealth)
        msgs.push({msg: `Free Mem: ${recentHealth.ramFreeKB} KB`,level: log.levels.INFO})
        msgs.push({msg: `SSID: ${recentHealth.ssid}`,level: log.levels.INFO})
        msgs.push({msg: `IP: ${recentHealth.wifiIP}`,level: log.levels.INFO})
        msgs.push({msg: `Rss: ${recentHealth.wifiRss}`,level: log.levels.INFO})
        msgs.push({msg: `Xmit Credits: ${recentHealth.xmitCredits}`,level: log.levels.INFO})
        msgs.push({msg: `mqtt Connections: ${recentHealth.mqttConnections}`,level: log.levels.INFO})
        msgs.push({msg: `Timer GitHash: ${fmtGitHash()}`,level: log.levels.INFO})
        msgs.push({msg: `Timer Build: ${fmtVersionStamp()}`,level: log.levels.INFO})
        msgFsOverlay(msgs,recentHealth)



        msgs=msgs
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
        <LogList {msgs}/>
    </Collapse>
</div>
