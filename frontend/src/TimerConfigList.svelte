<script>
    import { Card, CardBody, CardHeader, CardTitle, Badge } from "sveltestrap";
    import { tutorial as Timer } from "@rr1.us/timer_protobuf";
    import { Base64 } from "js-base64";
    import EllipsisButton from "./EllipsisButton.svelte";
    import log from "loglevel";
    import MaterialAdd from "./MaterialAdd.svelte";
    import { db } from "./eventDb.js";
    import { onMount } from "svelte";
    import { push, pop, replace, location } from "svelte-spa-router";
    import { initialReloadRoute } from "./stores.js";
    import { doRefreshBlocks } from "./stores.js";
    import TimerPbHealth from "./TimerPbHealth.svelte";
    var tcFromDexie = [{ timerName: "Initializing..." }];
    onMount(async () => {
        refreshDataFromDb();
        $initialReloadRoute = $location;
    });
    $: {
        refreshDataFromDb($doRefreshBlocks);
    }
    const refreshDataFromDb = async (trigger) => {
        log.debug("tcl: refreshDataFromDb data:", trigger);

        tcFromDexie = await db.TimerPbConfig.toArray();
        //tcFromDexie=[]
        for (let tcd of tcFromDexie) {
            const tcInit = Base64.toUint8Array(tcd.pb);
            log.debug("refreshDataFromDb: 1:", tcInit);
            const c = Timer.TimerConfig.decode(tcInit);
            Object.assign(tcd, c);
            log.debug("refreshDataFromDb: 2:", tcd);
            tcd.sortKey = `${tcd.seq}-${tcd.timerName}`;
        }
    };
    const navToTcDetail = (tc) => {
        log.debug("navToTcDetail:", tc);
        push(
            `/timerConfigElapsed?timerName=${tc.SK}&timerId=${tc.timerMqttClientId}`
        );
    };
    function getSortedTc(tcFromDexie) {
        tcFromDexie.sort((a, b) => {
            return a.sortKey.localeCompare(b.sortKey);
        });

        return tcFromDexie;
    }
    function toggleToolbar(event) {
        log.debug("toggleToolbar info event: ", event.detail.text);
        //showToolbar = !showToolbar;
    }
    function annotat(tc) {
        if (tc && tc.pb) {
            const tcBin = Base64.toUint8Array(tc.pb);
            const tcObject = Timer.TimerConfig.decode(tcBin);

            log.debug("annotat: ", tcObject);
            if (tcObject.deleted) {
                return "[Inactive]";
            }
        }
        return "";
    }
</script>

<h4>Race Timers</h4>
First Timer added will be finish line timer. Subsequent additions may be used to
report elapsed time split(s).
<p />
<MaterialAdd clickHandleRoute="/timerConfigElapsed" />

{#each getSortedTc(tcFromDexie) as tc (tc.at)}
    <Card class="mtj-3 border border-info">
        <CardHeader class="bg-info text-white">
            <CardTitle>
                <span on:keyup={() => {}} on:click={() => navToTcDetail(tc)}>
                    {tc.sortKey}
                    <nbsp />
                    {annotat(tc)}
                </span>
                <span class="spanRight">
                    <TimerPbHealth
                        timerName={tc.timerName}
                        timerId={tc.timerMqttClientId}
                    />
                </span>
            </CardTitle>
        </CardHeader>
    </Card>
{/each}
