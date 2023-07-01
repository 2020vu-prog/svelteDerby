<script>
    import log from "loglevel";

    import SpinnerButton from "./SpinnerButton.svelte";
    import {
        driverMap,
        nextOnBlockKey,
        doRefreshBlocks,
        standingsMap,
        racePhaseMap,
        carFilter,
        statusMessage,
        autoAnnounceResults,
        mqttMapSubscribe,
        mqttMapData,
        mqttTriggerVideoCapture,
        mqttEnabled,
        timerState,
        raceConfig,
        axios,
    } from "./stores.js";
    import Amplify, { PubSub } from "aws-amplify";
    import { AWSIoTProvider } from "@aws-amplify/pubsub/lib/Providers";
    import { db } from "./eventDb.js";
    import { onMount } from "svelte";
    import { onDestroy } from "svelte";
    import { tick } from "svelte";

    import aws_exports from "./aws-exports";
    import { exclude_internal_props } from "svelte/internal";
    const { v4: uuidv4 } = require("uuid");
    const EntityFactory = require("../../backend/modules/lambdaDerby/src/shared/EntityFactory.js");

    var pageLoadTimeMs = 0;
    const nextPhaseTopic = "nextPhase";
    const iosTriggerTopic = "iosTrigger";
    var client;
    var btnClass = "btn-info";
    const activeIotWatch = {};

    var refreshInProgressButton = false;
    var refreshInProgressMq = false;
    var refreshInProgressCca = false;

    var ecFromDexie = [];
    //TODO: these should happen consecutively.
    // always clearStore() before doRefresh()
    $: {
        log.debug("Race config changed. refreshing.");
        doRefresh($raceConfig); // call doRefresh if/when RaceConfig changes.
    }
    $: {
        watchIot($mqttEnabled);
    }

    $: {
        if ($doRefreshBlocks < 0) {
            clearStore();
        }
    }

    $: if (ecFromDexie) {
        checkIfRaceFrozenAndDisplayMessage($raceConfig);
    }

    async function watchIot() {
        if (!$raceConfig.orgId) {
            log.debug("watchIot : no org:  skip");
            return; // nothing to watch
        }
        if (!$mqttEnabled) {
            log.debug("watchIot : not enabled:  skip", $mqttEnabled);
            btnClass = "btn-info";
            return; // nothing to watch
        }
        log.debug("watchIot : do mqtt:  ", $mqttEnabled);

        /*
        const ccSession = await Auth.currentSession();
        log.debug("auth ccSession :", ccSession);
        const ccInfo = await Auth.currentCredentials();
        var cognitoIdentityId = "";
        if (ccInfo && ccInfo.data) {
            cognitoIdentityId = ccInfo.data.IdentityId;
            log.debug("auth ccInfo cognitoIdentityId:", cognitoIdentityId);
        } else {
            log.debug("auth ccInfo empty:", ccInfo);
        }
        */

        if (activeIotWatch && !activeIotWatch.plugged) {
            //await requstPermissionHack(cognitoIdentityId);
            Amplify.addPluggable(
                new AWSIoTProvider({
                    aws_pubsub_region: aws_exports.aws_pubsub_region,
                    aws_pubsub_endpoint: aws_exports.aws_pubsub_endpoint,
                })
            );
            activeIotWatch.plugged = true; // first time only.
        }

        const topic = "derby/" + $raceConfig.orgId + "/dist";

        if (activeIotWatch.subbedTopic === topic) {
            log.debug("watchIot : already subscribed skip");
            return;
        }

        if (activeIotWatch.subscription) {
            log.debug("watchIot: UnSubscribing", activeIotWatch.subscription);
            activeIotWatch.subscription.unsubscribe();
        }
        log.debug("watchIot: Subscribing to:", topic);
        activeIotWatch.subbedTopic = topic;
        btnClass = "btn-success";
        activeIotWatch.subscription = PubSub.subscribe(topic).subscribe({
            next: async (data) => {
                btnClass = "btn-success";

                log.debug("watchIot: Message received", data);
                log.debug("watchIot: Message value", data.value);
                await applyFromMqMsg(data.value);
            },
            error: (error) => {
                btnClass = "btn-danger";
                console.error("watchIot: AWS iot error:", error);
                potentialReloadPage();
            },
            close: () => {
                btnClass = "btn-warning";
                log.debug("watchIot: AWS iot Done");
            },
        });

        //syncAutoAnnounceSubscription();
        //syncVideoCaptureSubscription();
    }

    // toggle subscription when prefs change.
    //$: syncAutoAnnounceSubscription($autoAnnounceResults);
    //$: syncVideoCaptureSubscription($mqttTimerSubscribe);
    $: syncMapSubscriptions($mqttMapSubscribe);

    function potentialReloadPage() {
        log.debug("potentialReloadPage: begin");
        const oneMinute = 60 * 1000;
        const now = new Date().getTime();
        if (now > pageLoadTimeMs + oneMinute) {
            log.debug("potentialReloadPage: fired");
            location.reload();
        }
    }
    async function syncMapSubscriptions() {
        const tag = "tag:syncMapSubscriptions";
        const topics = Object.keys($mqttMapSubscribe);
        for (let topic of topics) {
            const expires = $mqttMapSubscribe[topic];
            const subscribeEnabled = expires && expires > new Date().getTime();
            log.info(
                `${new Date().toLocaleTimeString()} ${tag} ${topic} ${subscribeEnabled} ${expires}`
            );

            /*
        const timerTopic = $mqttTimerTopic.includes("/")
            ? $mqttTimerTopic
            : `derby/${$mqttTimerTopic}/rpi/+`;
            */
            syncSubscription(subscribeEnabled, topic, onMapMqttData);
        }
    }
    async function onMapMqttData(json, topic) {
        log.debug(`syncMap ononMapMqttData: ${topic}`);
        // potentialCaptureJ(json);

        $mqttMapData[topic] = json;
        $mqttMapData = $mqttMapData; //tickle state listeners
        await tick();
    }
    function potentialCaptureJ(json) {
        log.debug("potentialCaptureJ: ", json);
        var timerKey;
        if (json.microb) {
            timerKey = "MQTT-" + json.microb;
        } else {
            timerKey = "MQTT-" + uuidv4();
        }
        if (json.pinType) {
            const pinType = json.pinType;
            const pinState = json.pinState;
            log.debug(`potentialCapture: pinType: ${pinType}`);

            // mqtt message being processed out of sequence??
            // RacePhase only sees leading edge of car.  don't capture video on a trailing edge event!
            // (It should be throttled if it is recv'd in correct order, but that didn't happen)
            if (pinType === "lane" && pinState === 1) {
                if (!shouldThrottle()) {
                    $mqttTriggerVideoCapture = timerKey;
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

    async function syncSubscription(subEnabled, topicP, onMsg) {
        const tag = "tag:syncSubscription:" + topicP;
        if (activeIotWatch && activeIotWatch.plugged) {
        } else {
            log.debug(`${tag} skipping, not ready`);
            return;
        }
        log.debug(`${tag}: ${subEnabled} `);
        if (subEnabled) {
            if (activeIotWatch[topicP]) {
                // no action needed.
                log.debug(`${tag}: ${topicP} subscribe stand down`);
            } else {
                log.debug(`${tag}: Subscribing ${topicP}`);
                activeIotWatch[topicP] = await mySubscribe(topicP, onMsg);
            }
        } else {
            if (activeIotWatch[topicP]) {
                log.debug(`${tag}: UnSubscribing ${activeIotWatch[topicP]}`);
                activeIotWatch[topicP].unsubscribe();
                delete activeIotWatch[topicP];
            } else {
                log.debug(`${tag}: ${topicP} unsubscribe stand down`);
            }
        }
    }
    async function mySubscribe(topicP, onMsg) {
        const tag = "tag:mySubscribe";
        return PubSub.subscribe(topicP).subscribe({
            next: async (data) => {
                log.debug(`${tag}: ${topicP} mqMessage received`, data);
                log.debug(`${tag}: ${topicP} mqMessage value`, data.value);
                await onMsg(data.value, topicP);
            },
            error: (error) => {
                console.error(`${tag}: ${topicP} AWS iot error:`, error);
            },
            close: () => log.debug(`${tag}: ${topicP}  AWS iot Done`),
        });
    }
    // called when a message arrives

    const sortBy = (field, reverse, primer) => {
        var key = primer
            ? function (x) {
                  return primer(x[field]);
              }
            : function (x) {
                  return x[field];
              };

        reverse = !reverse ? 1 : -1;

        return function (a, b) {
            return (a = key(a)), (b = key(b)), reverse * ((a > b) - (b > a));
        };
    };

    const loadCcaHistory = async (s3Path, pendingBulk, histP) => {
        log.debug("LoadCca begin.");
        refreshInProgressCca = true;

        try {
            // baseUrl is /app.   archives are at root.
            const response = await $axios.get(
                $raceConfig.baseUrl + "/../" + s3Path
            );
            log.debug("LoadCca finished:", response);
            await parseAndApply(response, false, pendingBulk, histP); // don't recurse into another CCA load
        } catch (err) {
            log.debug("LoadCca failed:", err);
        }
        refreshInProgressCca = false;
    };
    const applyFromMqMsg = async (json) => {
        refreshInProgressMq = true;
        const hist = getHistFromStore();
        const entityFactory = new EntityFactory({});
        const e = entityFactory.build(json);
        log.debug("Entity from mq:", e);
        const pendingBulk = {};
        await applyEntityToHist(e, hist, pendingBulk);
        await flushPendingBulk(pendingBulk);
        applyHistToStore(hist);
        refreshInProgressMq = false;
    };
    const applyHistToStore = (hist) => {
        $driverMap = hist.Participant;

        $nextOnBlockKey = getNextOnBlockKeyFromRP(hist.RacePhase);
        //const sortedStandings=Object.values(hist.RaceStanding).sort(sortBy('lastUpdate', true, parseInt));
        $standingsMap = hist.RaceStanding;

        //const sortedPhases=Object.values(hist.RacePhase).sort(sortBy('lastUpdate', true, parseInt));
        //racePhaseMap.set(hist.RacePhase)
        $racePhaseMap = hist.RacePhase;
        log.debug("HotLoad: rpm now:", Object.keys(hist.RacePhase));

        $doRefreshBlocks = new Date().getTime();
        log.debug("HotLoad: updated doRefreshBlocks");
    };
    const clearStore = () => {
        $nextOnBlockKey = "N/A";
        $racePhaseMap = {};
        $carFilter = "";
        $doRefreshBlocks = 0;
        $driverMap = {};
        $standingsMap = {};
        log.debug("clearStore complete");
    };
    const getHistFromStore = () => {
        return {
            Participant: $driverMap,
            RacePhase: $racePhaseMap,
            RaceStanding: $standingsMap,
            BracketMetaData: {},
            BracketPos: {},
            EventConfig: {},
            TimerConfig: {},
            TimerPbConfig: {},
        };
    };

    /*
     **
     */
    async function parseAndApply(response, doLoadCca, pendingBulk, histP) {
        log.debug("parseAndApply:", doLoadCca, histP);
        const startTime = new Date().getTime();
        const entityFactory = new EntityFactory({});

        const hist = histP ? histP : getHistFromStore();

        //TODO:   shouldn't clear hist on refresh (we just loaded it!)

        entityFactory.entityTypes.forEach((et) => {
            log.debug("et:", et);
            if (!hist[et]) {
                hist[et] = {};
            }
        });

        for (var i = 0; i < response.data.length; i++) {
            const json = response.data[i];
            const e = entityFactory.build(json);
            if (e != null) {
                await applyEntityToHist(e, hist, pendingBulk);
            } else {
                if (doLoadCca && json.PK === "CCA" && json.s3) {
                    await loadCcaHistory(json.s3, pendingBulk, hist);
                }
            }
        }
        if (!histP) {
            log.debug("parseAndApply: saving hist");
            applyHistToStore(hist);
        }

        const elapsedTime = new Date().getTime() - startTime;

        $statusMessage = {
            text: `Refresh took ${elapsedTime}`,
            type: "success",
            key: "refreshTime",
        };

        return hist;
    }

    async function applyEntityToHist(e, hist, pendingBulk) {
        log.debug(new Date().toTimeString(), " entitx", e);
        const sk = e.classKey;
        const pk = e.classType;

        const key = { PK: pk, SK: sk, at: e.at };
        //const got = await db["EventHistory"].get({ PK: pk, SK: sk, at: e.at });
        //log.debug(key, `Maybe EventHistory  got ${got}`);

        //const idh = await db["EventHistory"].put(e);

        //log.debug(`Added EventHistory with id ${idh}`);
        log.debug(`Added EventHistory with id ${key}`);
        addPendingBulk(pendingBulk, "EventHistory", e);
        const tblHist = hist[pk];

        if (!tblHist) {
            log.debug("skipping load for pk: ", pk);
            return;
        }
        if (tblHist[sk] && tblHist[sk].lastUpdate > e.lastUpdate) {
        } else {
            tblHist[sk] = e;
            addPendingBulk(pendingBulk, e.classType, e);
            //const id = await db[e.classType].put(e);
            //log.debug(`Added ${e.classType} with id ${id}`);
        }
    }
    async function flushPendingBulk(pendingBulk) {
        for (const [tblName, pendingList] of Object.entries(pendingBulk)) {
            if (db[tblName]) {
                log.debug(`flushPending begin: ${tblName}`);
                await db[tblName].bulkPut(pendingList);
                updateConfigStore(tblName, pendingList);
                log.debug(`flushPending done: ${tblName}`);
            } else {
                log.debug(`flushPending skipping: ${tblName}`);
            }
        }
    }

    function updateConfigStore(tblName, pendingList) {
        if (tblName !== "EventConfig") return;

        log.debug(
            `updateConfigStore replacing raceConfig pre000: `,
            $raceConfig
        );

        pendingList.forEach((eventConfig) => {
            if (eventConfig.at > $raceConfig.at) {
                log.debug(
                    `updateConfigStore ${eventConfig.at} and ${$raceConfig.at}`
                );

                log.debug(
                    `updateConfigStore replacing raceConfig ec: `,
                    eventConfig
                );
                log.debug(
                    `updateConfigStore replacing raceConfig pre: `,
                    $raceConfig
                );
                const newEc = $raceConfig;
                $raceConfig = Object.assign(newEc, eventConfig);
                log.debug(
                    `updateConfigStore replacing raceConfig post: `,
                    $raceConfig
                );
            }
        });
    }

    function addPendingBulk(pendingBulk, tblName, e) {
        if (!pendingBulk[tblName]) {
            pendingBulk[tblName] = [];
        }
        pendingBulk[tblName].push(e);
    }

    const getNextOnBlockKeyFromRP = (rpTmp) => {
        log.debug("rpTmp:", rpTmp);
        //TODO: sort after filter!
        const onBlocks = Object.values(rpTmp)
            .filter((rp) => !rp.phaseResults)
            .filter((rp) => !rp.del);
        if (onBlocks.length > 0) {
            log.debug("set new nob:", onBlocks[0]);
            return onBlocks[0].classKey;
        } else {
            return {};
        }
    };
    var mounted = false;
    const pendingAudioList = [];

    onMount(async () => {
        pageLoadTimeMs = new Date().getTime();
        ecFromDexie = await db.EventConfig.toArray();
        mounted = true;
        checkIfRaceFrozenAndDisplayMessage();
        watchMqttSubscriptions();
    });
    function watchMqttSubscriptions() {
        log.debug("syncMap HotLoad watchMqttSubscriptions. 0");
        const interval = setInterval(function () {
            log.debug("syncMap HotLoad watchMqttSubscriptions. 1");
            syncMapSubscriptions();
        }, 60000);

        /*
        onDestroy(() => {
            log.debug("syncMap HotLoad watchMqttSubscriptions. 9");
            clearInterval(interval);
        });
        */
    }

    async function announceFromMqtt(mqMsg) {
        log.debug("announceFromMqtt: ", mqMsg);
        log.debug(`announceFromMqtt: ${mqMsg}`, mqMsg);
        log.debug(`announceFromMqtt already parsed?: ${mqMsg.outputUri}`);
        //const parsedMsg = JSON.parse(mqMsg);
        const parsedMsg = mqMsg;
        const mediaMatch = mqMsg.outputUri.match(/\/media\/.*/);
        if (mediaMatch && mediaMatch[0]) {
            const path = mediaMatch[0];
            $statusMessage = {
                text: `Audio queueing.`,
                type: "success",
            };
            log.debug(`announceFromMqtt path: ${path}`);
            queueAudio(path);
        } else {
            log.debug(`announceFromMqtt MISSING path`);
            $statusMessage = {
                text: `Audio missing path.`,
                type: "error",
            };
        }
    }

    var recentPA = ""; // jun 2023 workaround for duplicate subscribed issue
    function queueAudio(path) {
        if (recentPA === path) {
            tattle(`skipping duplicate request ${path}`);
        } else {
            recentPA = path;

            tattle(`queueing ${path}`);
            pendingAudioList.push(path);
            triggerAudioPlayer();
        }
    }
    var audioPlaying = false;
    function triggerAudioPlayer() {
        tattle("trigger begin");
        if (pendingAudioList.length == 0) return; // no-op.
        if (audioPlaying) return; // no concurrent audio players!

        audioPlaying = true;
        const audio = new Audio(pendingAudioList.shift());
        tattle("trigger shifted");
        audio.onended = async function () {
            await sleep(2000);
            audioPlaying = false;
            tattle("trigger onend");
            triggerAudioPlayer(); // won't do anything unless requests were queued up while playing
        };
        audio.play();
    }
    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    function tattle(msg) {
        // root cause looks like double subscribe.
        //log.debug("tattle :", msg, pendingAudioList.length);
    }
    const doRefresh = async () => {
        refreshInProgressButton = true;
        //await dbInit();
        log.debug("old nobKey:", $nextOnBlockKey);
        if ($raceConfig.orgId && $raceConfig.orgIz) {
        } else {
            log.debug("no selected race");
            refreshInProgressButton = false;
            return;
        }

        if ($raceConfig.archived === "true") {
            await loadArchivedData();
        } else {
            watchIot();

            const url =
                $raceConfig.baseUrl +
                "/getRaceHistory?orgId=" +
                $raceConfig.orgId +
                "&orgIz=" +
                $raceConfig.orgIz;
            try {
                const response = await $axios.get(url);
                log.debug("history:" + response.data.length);
                //log.debug("history:",response.data);
                const pendingBulk = {};
                await parseAndApply(response, true, pendingBulk);
                await flushPendingBulk(pendingBulk);
                ecFromDexie = await db.EventConfig.toArray();
            } catch (err) {
                log.debug(err);
            }
        }
        refreshInProgressButton = false;
    };
    function isArchived(ttlSecondsUnusedSvelteTrigger) {
        log.debug("isArchived passed ecFromDexie: ", ecFromDexie);
        return ecFromDexie && ecFromDexie[0] && ecFromDexie[0].archived;
    }
    function checkIfRaceFrozenAndDisplayMessage() {
        if (
            ecFromDexie &&
            ecFromDexie[0] &&
            ecFromDexie[0].TTL &&
            !ecFromDexie[0].archived
        ) {
            const entityFactory = new EntityFactory({});
            const eventConfigEntity = entityFactory.build(ecFromDexie[0]);
            const faReturn = eventConfigEntity.checkIfFrozenOrArchived();
            if (faReturn["status"] == "frozen") {
                $statusMessage = {
                    text:
                        `This race is frozen. It will archive at: ` +
                        new Date(ecFromDexie[0].TTL * 1000),
                    type: "archiveWarning",
                    key: "archiveWarning",
                    TTL:
                        faReturn.secondsUntilArchive * 1000 +
                        new Date().getTime(),
                };
            } else if (faReturn["status"] == "") {
                var timerDueMs =
                    (faReturn.secondsUntilArchive -
                        faReturn.freezeWarningSeconds) *
                    1000;
                setTimeout(checkIfRaceFrozenAndDisplayMessage, timerDueMs);
            }
        }
    }
    async function loadArchivedData() {
        log.debug("LoadArchive begin.");
        refreshInProgressCca = true;

        var s3Path =
            "/archive/" +
            $raceConfig.orgIz +
            "/" +
            $raceConfig.orgId +
            "/archive.json";

        try {
            const response = await $axios.get(
                $raceConfig.baseUrl + "/.." + s3Path
            );
            log.debug("LoadArchive finished:", response);
            const hist = getHistFromStore();
            const pendingBulk = {};
            await parseAndApply(response, false, pendingBulk, hist);
            await flushPendingBulk(pendingBulk);
            applyHistToStore(hist);
            ecFromDexie = await db.EventConfig.toArray();
        } catch (err) {
            log.debug("LoadArchive failed:", err);
        }
        refreshInProgressCca = false;
    }
</script>

{#if isArchived(ecFromDexie, $raceConfig)}
    <SpinnerButton spinning={false} disabled={true}>
        Race Archived
    </SpinnerButton>
{:else}
    <SpinnerButton
        on:click={doRefresh}
        spinning={refreshInProgressButton ||
            refreshInProgressMq ||
            refreshInProgressCca}
        {btnClass}
    >
        Refresh
    </SpinnerButton>
{/if}
