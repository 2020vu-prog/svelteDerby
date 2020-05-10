<script>

    import axios from "axios";
    import { driverMap, nextOnBlockKey, doRefreshBlocks, standingsMap, racePhaseMap, carFilter, statusMessage } from './stores.js';
    import { store } from './stores/auth.js'
    import { raceConfig } from './stores.js';
    import { Auth } from 'aws-amplify';
    import Amplify, { PubSub } from 'aws-amplify';
    import { AWSIoTProvider } from '@aws-amplify/pubsub/lib/Providers';
    import { db, localConfigDb } from './eventDb.js';
    import { onMount } from "svelte";

    const EntityFactory = require('../backend/modules/lambdaDerby/src/shared/EntityFactory.js')

    const nextPhaseTopic = "nextPhase";
    const iosTriggerTopic = "iosTrigger";
    var client;
    var btnClass = "btn-danger";
    const activeIotWatch = {};

    //TODO: these should happen consecutively.
    // always clearStore() before doRefresh()
    $: {
        console.log("Race config changed. refreshing.")
        doRefresh($raceConfig); // call doRefresh if/when RaceConfig changes.
    }
    $: {
        if ($doRefreshBlocks < 0) {
            clearStore();
        }
    }
    const watchIot = () => {
        if (!$raceConfig.orgId) {
            console.log("watchIot : no org:  skip")
            return;  // nothing to watch
        }
        if (activeIotWatch && !activeIotWatch.plugged) {
            Amplify.addPluggable(new AWSIoTProvider({
                aws_pubsub_region: 'us-east-2',
                aws_pubsub_endpoint: 'wss://a1fobetfjrk30o-ats.iot.us-east-2.amazonaws.com/mqtt',
            }));
            activeIotWatch.plugged = true // first time only.
        }


        /*
        Auth.currentCredentials().then((info) => {
          const cognitoIdentityId = info.data.IdentityId;
          console.log("auth idid:", cognitoIdentityId)
        });
        */

        const topic = "derby/" + $raceConfig.orgId + "/dist"

        if (activeIotWatch.subbedTopic === topic) {
            console.log("watchIot : already subscribed skip")
            return;
        }

        if (activeIotWatch.subscription) {
            console.log("watchIot: UnSubscribing", activeIotWatch.subscription)
            activeIotWatch.subscription.unsubscribe()
        }
        console.log("watchIot: Subscribing to:", topic)
        activeIotWatch.subbedTopic = topic;
        activeIotWatch.subscription = PubSub.subscribe(topic).subscribe({
            next: async data => {
                console.log('watchIot: Message received', data);
                console.log('watchIot: Message value', data.value);
                await applyFromMqMsg(data.value);
            },
            error: error => console.error('watchIot: AWS iot error:', error),
            close: () => console.log('watchIot: AWS iot Done'),
        });
    }



    // called when a message arrives

    const sortBy = (field, reverse, primer) => {
        var key = primer ?
            function (x) {
                return primer(x[field])
            } :
            function (x) {
                return x[field]
            };

        reverse = !reverse ? 1 : -1;

        return function (a, b) {
            return a = key(a), b = key(b), reverse * ((a > b) - (b > a));
        }
    };

    const loadCcaHistory = async (s3Path, histP) => {
        console.log("LoadCca begin.")

        try {
            // baseUrl is /app.   archives are at root.
            const response = await axios.get($raceConfig.baseUrl + "/../" + s3Path);
            console.log("LoadCca finished:", response)
            parseAndApply(response, false, histP); // don't recurse into another CCA load
        }
        catch (err) {
            console.log("LoadCca failed:", err)
        }
    }
    const applyFromMqMsg = async (json) => {
        const hist = getHistFromStore();
        const entityFactory = new EntityFactory({});
        const e = entityFactory.build(json);
        console.log("Entity from mq:", e)
        await applyEntityToHist(e, hist);
        applyHistToStore(hist);
    }
    const applyHistToStore = (hist) => {
        $driverMap = hist.Participant;


        $nextOnBlockKey = getNextOnBlockKeyFromRP(hist.RacePhase)
        //const sortedStandings=Object.values(hist.RaceStanding).sort(sortBy('lastUpdate', true, parseInt));
        $standingsMap = hist.RaceStanding;

        //const sortedPhases=Object.values(hist.RacePhase).sort(sortBy('lastUpdate', true, parseInt));
        //racePhaseMap.set(hist.RacePhase)
        $racePhaseMap = hist.RacePhase
        console.log("HotLoad: rpm now:", Object.keys(hist.RacePhase));

        $doRefreshBlocks = new Date().getTime()
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

    }
    const getHistFromStore = () => {
        return {
            Participant: $driverMap,
            RacePhase: $racePhaseMap,
            RaceStanding: $standingsMap,
            BracketMetaData: {},
            BracketPos: {},
            EventConfig: {},

        }
    };

    /*
    **
    */
    const parseAndApply = async (response, doLoadCca, histP) => {
        console.log("parseAndApply:", doLoadCca, histP)
        const startTime = new Date().getTime();
        const entityFactory = new EntityFactory({});

        const hist = (histP) ? histP : getHistFromStore();



        //TODO:   shouldn't clear hist on refresh (we just loaded it!)

        entityFactory.entityTypes.forEach(et => {
            console.log("et:", et)
            if (!hist[et]) {
                hist[et] = {};
            }
        });


        for (var i = 0; i < response.data.length; i++) {

            const json = response.data[i];
            const e = entityFactory.build(json);
            if (e != null) {
                await applyEntityToHist(e, hist);
            }
            else {
                console.log("wtf json: ", json)
                if (doLoadCca && json.PK === "CCA" && json.s3) {
                    await loadCcaHistory(json.s3, hist);
                }
            }
        }
        if (!histP) {
            console.log("parseAndApply: saving hist")
            applyHistToStore(hist);
        }

        const elapsedTime = new Date().getTime() - startTime;

        $statusMessage = {
            text: `Refresh took ${elapsedTime}`,
            type: "success"
        }

        return hist;
    }
    const applyEntityToHist = async (e, hist) => {
        console.log("entity", e);
        const sk = e.classKey;
        const pk = e.classType;

        const idh = await db['EventHistory'].put(e);
        console.log(`Added EventHistory with id ${idh}`);
        const tblHist = hist[pk];

        if (!tblHist) {
            console.log("skipping load for pk: ", pk);
            return;
        }
        if (tblHist[sk] && tblHist[sk].lastUpdate > e.lastUpdate) { }
        else {
            tblHist[sk] = e;
            if (db[e.classType]) {
                const id = await db[e.classType].put(e);
                console.log(`Added ${e.classType} with id ${id}`);
            }

        }
    }

    const getNextOnBlockKeyFromRP = (rpTmp) => {
        console.log("rpTmp:", rpTmp)
        //TODO: sort after filter!
        const onBlocks = Object.values(rpTmp).filter(rp => (!rp.phaseResults));
        if (onBlocks.length > 0) {
            console.log("set new nob:", onBlocks[0])
            return onBlocks[0].classKey;
        } else {
            return {};
        }
    }
    onMount(async () => {

    });
    const doRefresh = async () => {

        //await dbInit();
        console.log("old nobKey:", $nextOnBlockKey)
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;
        if ($raceConfig.orgId && $raceConfig.orgIz) { }
        else {
            console.log("no selected race");
            return;
        }

        watchIot();

        axios.defaults.headers.common['Authorization'] = bearer;
        axios.get($raceConfig.baseUrl + "/getRaceHistory?orgId=" + $raceConfig.orgId + "&orgIz=" + $raceConfig.orgIz)
            .then((response) => {
                console.log("history:" + response.data.length);
                //console.log("history:",response.data);
                parseAndApply(response, true);
            })
            .catch((err) => {
                console.log(err);
            })
    };
</script>

<button class="btn {btnClass}" type="button" on:click|preventDefault={doRefresh}>
    Refresh
</button>