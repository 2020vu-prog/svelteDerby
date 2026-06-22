<script>
    import log from "loglevel";

    import SpinnerButton from "./SpinnerButton.svelte";
    import * as axiosVanilla  from "axios";
    import {
        driverMap,
        nextOnBlockKey,
        doRefreshBlocks,
        standingsMap,
        racePhaseMap,
        carFilter,
        pushMessage,
        autoAnnounceResults,
        mqttMapSubscribe,
        mqttMapData,
        mqttTriggerVideoCapture,
        mqttEnabled,
        timerState,
        raceConfig,
        axios,
        recentRefreshMs,
        mqttPsUrlMap,
        reRenderHotLoad,
        developerMode,
        mp3Playing,
    } from "./stores.js";
    //import { mqtt } from "mqtt";
    import * as mqtt from "mqtt";
    import { db } from "./eventDb.js";
    import { onMount } from "svelte";
    import { onDestroy } from "svelte";
    import { tick } from "svelte";

    import aws_exports from "./aws-exports";
    import { exclude_internal_props } from "svelte/internal";
    //var mqSem = require("semaphore")(1);
    import { Lock } from "semaphore-async-await";
    const mqttSubLock = new Lock(1);

    const { v4: uuidv4 } = require("uuid");
    const EntityFactory = require("../../backend/modules/lambdaDerby/src/shared/EntityFactory.js");

    const uuidConst = uuidv4();
    let mqClient = "";
    var pageLoadTimeMs = 0;
    const nextPhaseTopic = "nextPhase";
    const iosTriggerTopic = "iosTrigger";
    var client;
    var btnClass = "btn-info";
    let activeIotWatch = {
        errors:[],
        currentDistTopic:"",
        topic:{}
    };

    var refreshInProgressButton = false;
    var refreshInProgressMq = false;
    var refreshInProgressCca = false;

    var ecFromDexie = [];
    //TODO: these should happen consecutively.
    // always clearStore() before doRefreshViaHttp()
    /*
    $: {
        log.debug("Race config changed. refreshing.",JSON.stringify($raceConfig));
        doRefreshViaHttp($raceConfig); // call doRefresh if/when RaceConfig changes.
    }
    $: {
        watchIot($mqttEnabled);
    }
    */
    $: {
        configChanged($raceConfig,$mqttEnabled)
    }

    $: {
        if ($doRefreshBlocks < 0) {
            clearStore();
        }
    }

    $: if (ecFromDexie) {
        checkIfRaceFrozenAndDisplayMessage($raceConfig);
    }

    function applyBtnClass(){
        if (isArchived()) {
            btnClass = "btn-secondary";
            return;
        }
        if (!$mqttEnabled) {
            btnClass = "btn-secondary";
            return;
        }
        if(activeIotWatch['errors'].length>0){
            btnClass = "btn-danger";
            return;
        }
        if (mqClient && mqClient.connected){
                btnClass = "btn-success";
        }else{

                btnClass = "btn-warning";
        }

    }
    function resetMqtt(){
        log.debug('resetMqtt')
        activeIotWatch = {
            errors:[],
            topic:{},
        currentDistTopic:""

        };

        if(mqClient){
            mqClient.end();
            mqClient=""
        }
        applyBtnClass()
    }
    async function configChanged(){
            log.debug("configChanged : begin:",$raceConfig.orgId);
        if (!$raceConfig.orgId) {
            resetMqtt()
            log.debug("configChanged : no org:  skip");
            return; // nothing to watch
        }
        if(isArchived()){
            resetMqtt()
            log.debug("configChanged : isArchived!skip",$raceConfig.orgId);
            doRefreshViaHttp();
            return;
        }
        if (!$mqttEnabled) {
            resetMqtt()
            log.debug("configChanged : not enabled:  skip", $mqttEnabled);
            doRefreshViaHttp();
            return;
        }
        if(activeIotWatch.currentDistTopic !==getDistTopic()){
            log.debug("configChanged : mqtt reset");
            resetMqtt() //fall thru to re-connect
        }
        // watchIot will call doRefreshViaHttp() onConnect
        log.debug("configChanged : fall through");
        await watchIot("configChanged") 

    }
    async function watchIot(from) {
        applyBtnClass();

        log.debug("watchIot : do mqtt:  ", $mqttEnabled,"from:",from);

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
            await refreshPsUrl();
            mqClient = mqtt.connect($mqttPsUrlMap.url,{
                transformWsUrl: transformWsUrl,
                reconnectPeriod:4000,
            });
            mqClient.on("message", onMsgGeneric);
            mqClient.on("connect", onConnect);
            mqClient.on("disconnect", applyBtnClass);
            mqClient.on("close", applyBtnClass);
            mqClient.on("offline", applyBtnClass);
            mqClient.on("error", applyBtnClass);

            activeIotWatch.plugged = true; // first time only.
        }

        const topic = getDistTopic()


        log.debug("watchIot: Subscribing to:", topic);
        //mqClient.subscribe(topic, {}, onSubscribed);
        syncSubscription(true, topic, applyFromMqMsg)
        activeIotWatch.currentDistTopic=topic

        /*
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

        */
        syncAutoAnnounceSubscription();
        syncAutoAnnounceSubscription();
        syncAutoAnnounceSubscription();
        //syncVideoCaptureSubscription();
    }
    function getDistTopic(){
        if($raceConfig && $raceConfig.orgId){

            const topic = "derby/" + $raceConfig.orgId + "/dist";
            return topic
        }else{
            return "";
        }

    }

    // toggle subscription when prefs change.
    $: syncAutoAnnounceSubscription($autoAnnounceResults);
    //$: syncVideoCaptureSubscription($mqttTimerSubscribe);
    $: syncMapSubscriptions($mqttMapSubscribe);

    function isPsMapRefreshNeeded() {
        const now=new Date().getTime()
        /* ps url expires early :-(
        if($mqttPsUrlMap && 
        $mqttPsUrlMap.expires &&
        $mqttPsUrlMap.expires *1000 > now){
            log.debug("isPsMapExpired ps bpass0");
            return false;
        }
        */
        // todo: aws urll expiring after 5 minutes instead of 1 hour !??
        if($mqttPsUrlMap && 
        $mqttPsUrlMap.issued &&
        $mqttPsUrlMap.issued +(5*60*1000) > now){
            log.debug("refresh ps bpass: issue recent");
            return false
        } 

        //no aggressive retries.  give backend a chance to reply!
        if($mqttPsUrlMap && 
        $mqttPsUrlMap.requested &&
        $mqttPsUrlMap.requested +(30*1000) > now){
            log.debug("refresh ps bpass: request recent");
            return false
        } 
            log.debug("refresh ps bpass: NOT");
        
        return true
    }
    async function refreshPsUrl() {
        if(! isPsMapRefreshNeeded()){
            log.debug("refresh ps bpass: BPASS");
            return;

        }

        log.debug("refresh ps bpass:  PROCEED");
        $mqttPsUrlMap.requested=new Date().getTime();
        $mqttPsUrlMap = $mqttPsUrlMap 
       
         //   log.debug("refresh ps ",$mqttPsUrlMap);
        //log.debug("refresh ps0",$mqttPsUrlMap.epoch +(600*1000))
        //log.debug("refresh ps1",new Date().getTime())
            log.debug("refresh ps stale");
        const response = await axiosVanilla.get(aws_exports.mqtt_ps_url, {
            headers: {
                "x-invoke-key": aws_exports.mqtt_ps_key,
            },
        });
        if (response.data.url) {
            log.debug("refresh ps good:",JSON.stringify(response.data));
            $mqttPsUrlMap = {
                url:response.data.url,
                expires:response.data.expires,
                issued: new Date().getTime(),
                requested:$mqttPsUrlMap.requested,
            }
        } else {
            log.debug("refresh ps fail");
            $mqttPsUrlMap.url="";
            $mqttPsUrlMap = $mqttPsUrlMap 
        }
    }

    function onSubscribed(err,granted) {
        if(err){
            activeIotWatch['errors'].push(err);
            pushMessage( {
            text: err,
            type: "error",
        });
            applyBtnClass();
        }
        log.debug("onSubscribed", err,JSON.stringify(granted));
    }
    const msgQ=[]
    async function onConnect(topic, message) {
        applyBtnClass()
        doRefreshViaHttp();

    }
    async function onMsgGeneric(topic, message) {
        // message is Buffer
        log.debug("onMsgGeneric", topic, message.toString());
        if (!isTopicHandler(activeIotWatch.topic[topic])) {
            log.debug("onMsgGeneric skipping, no handler:", topic);
            return;
        }
        msgQ.push({
            topic: topic,
            message:message,
        })
        potentialDrainQ()


        //await sleep(1000); // does parent await for handler??
        //TODO: parent does NOT wait. we should queue and single thread
        log.debug("onMsgGeneric done")
    }


            let drainingQ=false
        function potentialDrainQ(){
            if(drainingQ)return
            drainingQ=true
        log.debug("draining begin")
            while (msgQ.length>0){
                log.debug("draining ONE")
                const m=msgQ.pop()
                const topicHandler = activeIotWatch.topic[m.topic];
                if (!isTopicHandler(topicHandler)) {
                    log.debug("draining skipping, no handler:", m.topic);
                    continue;
                }
                const jsonMsg = JSON.parse(m.message.toString());
                topicHandler(jsonMsg,m.topic)
            }
        log.debug("draining done")
            drainingQ=false
        }

    function isTopicHandler(topicHandler) {
        return "function" === typeof topicHandler;
    }
        
    async function syncAutoAnnounceSubscription() {
        const shouldSub = $autoAnnounceResults && $mqttEnabled && !isArchived();
        log.debug("syncAutoAnnounceSubscription: voice ", shouldSub);

        const paTopic = "derby/" + $raceConfig.orgId + "/pa";
        await syncSubscription(shouldSub, paTopic, onVoiceMqttData);
        log.debug("syncAutoAnnounceSubscription: done.");
    }
    function onVoiceMqttData(json, topic) {
        log.debug("onVoiceMqttData: begin:", json);
        announceFromMqtt(json);
    }
    async function potentialDoubleClickReloadPage() {
        log.debug("potentialDoubleClickReloadPage: begin");
            pushMessage( {
                text: `Refreshing token, please Wait.`,
                type: "success",
            });

            await tick();
            await sleep(1000);
            expirePsUrl()
            log.debug("potentialDoubleClickReloadPage: fired");
            //recentRefreshMs window.location.reload();

            // install our uuid to requests reload.
            // --limits request to once per instance
            $reRenderHotLoad=uuidConst 
    }
    function expirePsUrl(){
        $mqttPsUrlMap.expires=2
        $mqttPsUrlMap.requested=2
        $mqttPsUrlMap.issued=2
        $mqttPsUrlMap=$mqttPsUrlMap
    }
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
        log.debug(`syncMap onMapMqttData: ${topic}`);

        $mqttMapData[topic] = json;
        $mqttMapData = $mqttMapData; //tickle state listeners
        await tick();
    }

    async function syncSubscription(subEnabled, topicP, onMsgh) {
        const tag = "tag:syncSubscription:" + topicP;
        log.debug(`${tag} begin`);
        /*
        mqSem.take(function () {
            _syncSubscription(subEnabled, topicP, onMsgh);
            mqSem.leave()
        });
        */
        await mqttSubLock.acquire();
        await _syncSubscription(subEnabled, topicP, onMsgh);
        await mqttSubLock.release();
        log.debug(`${tag} done`);
    }
    async function _syncSubscription(subEnabled, topicP, onMsgh) {
        const tag = "tag:_syncSubscription:" + topicP;
        log.debug(`${tag} begin`);
        if (activeIotWatch && activeIotWatch.plugged) {
        } else {
            log.debug(`${tag} skipping, not ready`);
            return;
        }
        log.debug(`${tag}: ${subEnabled} `);
        if (subEnabled) {
            if (activeIotWatch.topic[topicP]) {
                // no action needed.
                log.debug(`${tag}: ${topicP} subscribe stand down`);
            } else {
                log.debug(`${tag}: Subscribing ${topicP}`);
                activeIotWatch.topic[topicP] = await mySubscribe(topicP, onMsgh);
            }
        } else {
            if (activeIotWatch.topic[topicP]) {
                log.debug(`${tag}: UnSubscribing ${activeIotWatch.topic[topicP]}`);
                //activeIotWatch[topicP].unsubscribe();
                mqClient.unsubscribe(topicP);
                delete activeIotWatch.topic[topicP];
            } else {
                log.debug(`${tag}: ${topicP} unsubscribe stand down`);
            }
        }
        log.debug(`${tag} done`);
    }
    async function mySubscribe(topicP, onMsgh) {
        const tag = "tag:mySubscribe";
        mqClient.subscribe(topicP, {}, onSubscribed);
        return onMsgh
        return PubSub.subscribe(topicP).subscribe({
            next: async (data) => {
                log.debug(`${tag}: ${topicP} mqMessage received`, data);
                log.debug(`${tag}: ${topicP} mqMessage value`, data.value);
                await onMsgh(data.value, topicP);
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

    watchMqttSubscriptions();
    onMount( () => {
        onMountAsync()
        return () => {
            log.debug("HotLoad unmount");
            resetMqtt()
        };
    });
    async function onMountAsync(){
        /*
        document.addEventListener("contextmenu", function (e){
            e.preventDefault();
        }, false);
        */
        pageLoadTimeMs = new Date().getTime();
        ecFromDexie = await db.EventConfig.toArray();
        mounted = true;
        checkIfRaceFrozenAndDisplayMessage();
    }
    function watchMqttSubscriptions() {
        log.debug("syncMap HotLoad watchMqttSubscriptions. 0");
        const interval = setInterval(function () {
            log.debug("syncMap HotLoad watchMqttSubscriptions. 1");
            syncMapSubscriptions();
        }, 60000);

        onDestroy(() => {
            log.debug("syncMap HotLoad watchMqttSubscriptions. 9");
            clearInterval(interval);
        });
    }

    async function announceFromMqtt(mqMsg) {
        const qid=$developerMode?uuidConst:"";

        log.debug("announceFromMqtt qid: ",  qid);
        log.debug("announceFromMqtt: ", mqMsg);
        log.debug(`announceFromMqtt: ${mqMsg}`, mqMsg);
        log.debug(`announceFromMqtt already parsed?: ${mqMsg.outputUri}`);
        //const parsedMsg = JSON.parse(mqMsg);
        const parsedMsg = mqMsg;
        const mediaMatch = mqMsg.outputUri.match(/\/media\/.*/);
        if (mediaMatch && mediaMatch[0]) {
            const path = mediaMatch[0];
            pushMessage( {
                text: `Audio queueing.${qid}`,
                type: "success",
            });
            await tick(); // duplicate msgs??
            log.debug(`announceFromMqtt path: ${path}`);
            queueAudio(path);
        } else {
            log.debug(`announceFromMqtt MISSING path`);
            pushMessage( {
                text: `Audio missing path.`,
                type: "error",
            });
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
    $:{
        $mp3Playing= audioPlaying

    }
    var lastPlayed = "";
    function getNextAudio() {
        while (pendingAudioList.length > 0) {
            const nextAudio = pendingAudioList.shift();
            if (nextAudio && nextAudio != lastPlayed) {
                lastPlayed = nextAudio;
                return nextAudio;
            }
        }
        return "";
    }
    function triggerAudioPlayer() {
        tattle("trigger begin");
        if (audioPlaying) return; // no concurrent audio players!
        const nextAudio = getNextAudio();
        if (!nextAudio) return;

        audioPlaying = true;
        const audio = new Audio(nextAudio);
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
        log.debug("tattle :", msg, pendingAudioList.length);
    }
    function doRefreshClicked(){
        //potentialDoubleClickReloadPage();
        doRefreshViaHttp();

    }
    function doRefreshPressed(){
        potentialDoubleClickReloadPage();

    }
    const doRefreshViaHttp = async () => {
        const tag = "doRefresh";
        log.debug(`${tag} begin`);
        if (refreshInProgressButton) {
            log.debug(`${tag} skipped, already working`);
            return

        }
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
            //watchIot can now invoke http refresh on re-connect
            //await watchIot("fdr"); 

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
        $recentRefreshMs = new Date().getTime();
        log.debug(`${tag} done ${$recentRefreshMs}`);
    };
    function isArchived(ttlSecondsUnusedSvelteTrigger) {
        log.debug("isArchived passed ecFromDexie: ", ecFromDexie,JSON.stringify($raceConfig));
        if($raceConfig && $raceConfig.archived){
            return true
        }
        return false;
        //return ecFromDexie && ecFromDexie[0] && ecFromDexie[0].archived;
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
                pushMessage( {
                    text:
                        `This race is frozen. It will archive at: ` +
                        new Date(ecFromDexie[0].TTL * 1000),
                    type: "archiveWarning",
                    key: "archiveWarning",
                    TTL:
                        faReturn.secondsUntilArchive * 1000 +
                        new Date().getTime(),
                });
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
    let recentPsUrl="";
    function transformWsUrl  (url, options, client)  {
      //client.options.username = `token=${this.get_current_auth_token()}`;
      //client.options.clientId = `${this.get_updated_clientId()}`;

            refreshPsUrl(); // async request but transform won't await.  issue the request so it will be avlbl on subsequent retry...

            return $mqttPsUrlMap.url
    }
</script>

{#if isArchived(ecFromDexie, $raceConfig)}
    <SpinnerButton spinning={false} disabled={true}
        {btnClass}
      >
        Archived
    </SpinnerButton>
{:else}
    <SpinnerButton
        on:click={doRefreshClicked}
        on:press={doRefreshPressed}
        spinning={refreshInProgressButton ||
            refreshInProgressMq ||
            refreshInProgressCca}
        {btnClass}
    >
        Refresh
    </SpinnerButton>
{/if}
