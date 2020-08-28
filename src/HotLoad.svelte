<script>
    import axios from "axios";
    import {
        driverMap,
        nextOnBlockKey,
        doRefreshBlocks,
        standingsMap,
        racePhaseMap,
        carFilter,
        statusMessage,
        autoAnnounceResults,
        mqttTriggerVideoCapture,
    } from "./stores.js";
    import { store } from "./stores/auth.js";
    import { raceConfig } from "./stores.js";
    import { Auth } from "aws-amplify";
    import Amplify, { PubSub } from "aws-amplify";
    import { AWSIoTProvider } from "@aws-amplify/pubsub/lib/Providers";
    import { db } from "./eventDb.js";
    import { onMount } from "svelte";
    import aws_exports from "./aws-exports";

    const EntityFactory = require("../backend/modules/lambdaDerby/src/shared/EntityFactory.js");

    const nextPhaseTopic = "nextPhase";
    const iosTriggerTopic = "iosTrigger";
    var client;
    var btnClass = "btn-success";
    const activeIotWatch = {};

    var refreshInProgressButton = false;
    var refreshInProgressMq = false;
    var refreshInProgressCca = false;

    //TODO: these should happen consecutively.
    // always clearStore() before doRefresh()
    $: {
        console.log("Race config changed. refreshing.");
        doRefresh($raceConfig); // call doRefresh if/when RaceConfig changes.
    }
    $: {
        if ($doRefreshBlocks < 0) {
            clearStore();
        }
    }

    const requstPermissionHack = async (cognitoIdentityId) => {
        if (!cognitoIdentityId) {
            console.log("bypass rph. no id");
        }
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;

        axios.defaults.headers.common["Authorization"] = bearer;
        axios
            .get(
                $raceConfig.baseUrl +
                    "/requestMqttSubPermission?orgId=" +
                    $raceConfig.orgId +
                    "&orgIz=" +
                    $raceConfig.orgIz +
                    "&principal=" +
                    cognitoIdentityId
            )
            .then((response) => {
                console.log("requstPermissionHack:" + response.data.length);
            })
            .catch((err) => {
                console.log("requstPermissionHack failed:", err);
            });
    };
    async function watchIot() {
        if (!$raceConfig.orgId) {
            console.log("watchIot : no org:  skip");
            return; // nothing to watch
        }

        const ccSession = await Auth.currentSession();
        console.log("auth ccSession :", ccSession);
        const ccInfo = await Auth.currentCredentials();
        var cognitoIdentityId = "";
        if (ccInfo && ccInfo.data) {
            cognitoIdentityId = ccInfo.data.IdentityId;
            console.log("auth ccInfo cognitoIdentityId:", cognitoIdentityId);
        } else {
            console.log("auth ccInfo empty:", ccInfo);
        }

        if (activeIotWatch && !activeIotWatch.plugged) {
            await requstPermissionHack(cognitoIdentityId);
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
            console.log("watchIot : already subscribed skip");
            return;
        }

        if (activeIotWatch.subscription) {
            console.log("watchIot: UnSubscribing", activeIotWatch.subscription);
            activeIotWatch.subscription.unsubscribe();
        }
        console.log("watchIot: Subscribing to:", topic);
        activeIotWatch.subbedTopic = topic;
        activeIotWatch.subscription = PubSub.subscribe(topic).subscribe({
            next: async (data) => {
                btnClass = "btn-success";

                console.log("watchIot: Message received", data);
                console.log("watchIot: Message value", data.value);
                await applyFromMqMsg(data.value);
            },
            error: (error) => {
                btnClass = "btn-danger";
                console.error("watchIot: AWS iot error:", error);
            },
            close: () => {
                btnClass = "btn-warning";
                console.log("watchIot: AWS iot Done");
            },
        });
        syncAutoAnnounceSubscription();
    }

    // toggle subscription when prefs change.
    $: syncAutoAnnounceSubscription($autoAnnounceResults);

    async function syncAutoAnnounceSubscription() {
        if (activeIotWatch && activeIotWatch.plugged) {
        } else {
            console.log("syncAutoAnnounceSubscription skipping, not ready");
            return;
        }
        const paTopic = "derby/" + $raceConfig.orgId + "/pa";
        console.log(`syncAutoAnnounceSubscription: ${$autoAnnounceResults} `);
        if ($autoAnnounceResults) {
            if (activeIotWatch.paSubscription) {
                // no action needed.
                console.log(
                    `syncAutoAnnounceSubscription: ${paTopic} subscribe stand down`
                );
            } else {
                console.log(
                    `syncAutoAnnounceSubscription: Subscribing ${paTopic}`
                );
                activeIotWatch.paSubscription = PubSub.subscribe(
                    paTopic
                ).subscribe({
                    next: async (data) => {
                        console.log(
                            `syncAutoAnnounceSubscription: ${paTopic} paMessage received`,
                            data
                        );
                        console.log(
                            `syncAutoAnnounceSubscription: ${paTopic} paMessage value`,
                            data.value
                        );
                        announceFromMqtt(data.value);
                    },
                    error: (error) => {
                        console.error(
                            `syncAutoAnnounceSubscription: ${paTopic} AWS iot error:`,
                            error
                        );
                    },
                    close: () =>
                        console.log(
                            `syncAutoAnnounceSubscription: ${paTopic}  AWS iot Done`
                        ),
                });
            }
        } else {
            if (activeIotWatch.paSubscription) {
                console.log(
                    `syncAutoAnnounceSubscription: UnSubscribing ${activeIotWatch.paSubscription}`
                );
                activeIotWatch.paSubscription.unsubscribe();
                delete activeIotWatch.paSubscription;
            } else {
                console.log(
                    `syncAutoAnnounceSubscription: ${paTopic} unsubscribe stand down`
                );
            }
        }
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
        console.log("LoadCca begin.");
        refreshInProgressCca = true;

        try {
            // baseUrl is /app.   archives are at root.
            const response = await axios.get(
                $raceConfig.baseUrl + "/../" + s3Path
            );
            console.log("LoadCca finished:", response);
            await parseAndApply(response, false, pendingBulk, histP); // don't recurse into another CCA load
        } catch (err) {
            console.log("LoadCca failed:", err);
        }
        refreshInProgressCca = false;
    };
    const applyFromMqMsg = async (json) => {
        refreshInProgressMq = true;
        const hist = getHistFromStore();
        const entityFactory = new EntityFactory({});
        const e = entityFactory.build(json);
        console.log("Entity from mq:", e);
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
        console.log("HotLoad: rpm now:", Object.keys(hist.RacePhase));

        $doRefreshBlocks = new Date().getTime();
        console.log("HotLoad: updated doRefreshBlocks");
    };
    const clearStore = () => {
        $nextOnBlockKey = "N/A";
        $racePhaseMap = {};
        $carFilter = "";
        $doRefreshBlocks = 0;
        $driverMap = {};
        $standingsMap = {};
        console.log("clearStore complete");
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
        };
    };

    /*
     **
     */
    async function parseAndApply(response, doLoadCca, pendingBulk, histP) {
        console.log("parseAndApply:", doLoadCca, histP);
        const startTime = new Date().getTime();
        const entityFactory = new EntityFactory({});

        const hist = histP ? histP : getHistFromStore();

        //TODO:   shouldn't clear hist on refresh (we just loaded it!)

        entityFactory.entityTypes.forEach((et) => {
            console.log("et:", et);
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
                console.log("wtf json: ", json);
                if (doLoadCca && json.PK === "CCA" && json.s3) {
                    await loadCcaHistory(json.s3, pendingBulk, hist);
                }
            }
        }
        if (!histP) {
            console.log("parseAndApply: saving hist");
            applyHistToStore(hist);
        }

        const elapsedTime = new Date().getTime() - startTime;

        $statusMessage = {
            text: `Refresh took ${elapsedTime}`,
            type: "success",
        };

        return hist;
    }

    async function applyEntityToHist(e, hist, pendingBulk) {
        console.log(new Date().toTimeString(), " entitx", e);
        const sk = e.classKey;
        const pk = e.classType;

        const key = { PK: pk, SK: sk, at: e.at };
        //const got = await db["EventHistory"].get({ PK: pk, SK: sk, at: e.at });
        //console.log(key, `Maybe EventHistory  got ${got}`);

        //const idh = await db["EventHistory"].put(e);

        //console.log(`Added EventHistory with id ${idh}`);
        addPendingBulk(pendingBulk, "EventHistory", e);
        const tblHist = hist[pk];

        if (!tblHist) {
            console.log("skipping load for pk: ", pk);
            return;
        }
        if (tblHist[sk] && tblHist[sk].lastUpdate > e.lastUpdate) {
        } else {
            tblHist[sk] = e;
            addPendingBulk(pendingBulk, e.classType, e);
            //const id = await db[e.classType].put(e);
            //console.log(`Added ${e.classType} with id ${id}`);
        }
    }
    async function flushPendingBulk(pendingBulk) {
        for (const [tblName, pendingList] of Object.entries(pendingBulk)) {
            if (db[tblName]) {
                console.log(`flushPending begin: ${tblName}`);
                await db[tblName].bulkPut(pendingList);
                console.log(`flushPending done: ${tblName}`);
            } else {
                console.log(`flushPending skipping: ${tblName}`);
            }
        }
    }

    function addPendingBulk(pendingBulk, tblName, e) {
        if (!pendingBulk[tblName]) {
            pendingBulk[tblName] = [];
        }
        pendingBulk[tblName].push(e);
    }

    const getNextOnBlockKeyFromRP = (rpTmp) => {
        console.log("rpTmp:", rpTmp);
        //TODO: sort after filter!
        const onBlocks = Object.values(rpTmp)
            .filter((rp) => !rp.phaseResults)
            .filter((rp) => !rp.del);
        if (onBlocks.length > 0) {
            console.log("set new nob:", onBlocks[0]);
            return onBlocks[0].classKey;
        } else {
            return {};
        }
    };
    var mounted = false;
    const pendingAudioList = [];

    onMount(async () => {
        mounted = true;
    });
    async function announceFromMqtt(mqMsg) {
        console.log("mqMsg: ", mqMsg);
        console.log(`mqMsg: ${mqMsg}`, mqMsg);
        console.log(`mqMsg already parsed?: ${mqMsg.outputUri}`);
        //const parsedMsg = JSON.parse(mqMsg);
        const parsedMsg = mqMsg;
        const mediaMatch = mqMsg.outputUri.match(/\/media\/.*/);
        if (mediaMatch && mediaMatch[0]) {
            const path = mediaMatch[0];
            console.log(`paMessage path: ${path}`);
            queueAudio(path);
            $mqttTriggerVideoCapture = new Date().getTime();
        } else {
            console.log(`paMessage MISSING path`);
        }
    }
    function queueAudio(path) {
        pendingAudioList.push(path);
        triggerAudioPlayer();
    }
    var audioPlaying = false;
    function triggerAudioPlayer() {
        if (pendingAudioList.length == 0) return; // no-op.
        if (audioPlaying) return; // no concurrent audio players!

        audioPlaying = true;
        const audio = new Audio(pendingAudioList.shift());
        audio.onended = async function () {
            await sleep(2000);
            audioPlaying = false;
            triggerAudioPlayer(); // won't do anything unless requests were queued up while playing
        };
        audio.play();
    }
    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    const doRefresh = async () => {
        refreshInProgressButton = true;
        //await dbInit();
        console.log("old nobKey:", $nextOnBlockKey);
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;
        if ($raceConfig.orgId && $raceConfig.orgIz) {
        } else {
            console.log("no selected race");
            return;
        }

        watchIot();

        axios.defaults.headers.common["Authorization"] = bearer;
        const url =
            $raceConfig.baseUrl +
            "/getRaceHistory?orgId=" +
            $raceConfig.orgId +
            "&orgIz=" +
            $raceConfig.orgIz;
        try {
            const response = await axios.get(url);
            console.log("history:" + response.data.length);
            //console.log("history:",response.data);
            const pendingBulk = {};
            await parseAndApply(response, true, pendingBulk);
            await flushPendingBulk(pendingBulk);
            refreshInProgressButton = false;
        } catch (err) {
            console.log(err);
        }
    };
</script>

{#if !refreshInProgressButton && !refreshInProgressMq && !refreshInProgressCca}
    <button
        class="btn {btnClass}"
        type="button"
        on:click|preventDefault={doRefresh}>
        Refresh
    </button>
{:else}
    <img alt="noflag" src="data/circles.svg" width="25px" />
{/if}
