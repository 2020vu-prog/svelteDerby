<script>
    import { Card, CardBody, CardHeader, CardTitle, Badge } from "sveltestrap";
    import { tutorial as Timer } from "./generated/timer_pb.js";
    import { Base64 } from "js-base64";
    import EllipsisButton from "./EllipsisButton.svelte";
    import log from "loglevel";
    import MaterialAdd from "./MaterialAdd.svelte";
    import { db } from "./eventDb.js";
    import { onMount } from "svelte";
    import { push, pop, replace, location } from "svelte-spa-router";
    import { initialReloadRoute } from "./stores.js";
    var tcFromDexie = [{ timerName: "Initializing..." }];
    onMount(async () => {
        refreshDataFromDb();
        $initialReloadRoute = $location;
    });
    const refreshDataFromDb = async (trigger) => {
        log.debug("tcl: refreshDataFromDb data:", trigger);

        tcFromDexie = await db.TimerPbConfig.toArray();
    };
    const navToTcDetail = (tc) => {
        log.debug("navToTcDetail:", tc);
        push("/timerConfigElapsed?" + tc.SK);
    };
    function getSortedTc(tcFromDexie) {
        tcFromDexie.sort((a, b) => {
            return a.timerName
                .toLowerCase()
                .localeCompare(b.timerName.toLowerCase());
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
    <Card class="mtj-3 border border-info" on:click={() => navToTcDetail(tc)}>
        <CardHeader class="bg-info text-white">
            <CardTitle>
                <span class="spanRight">
                    <EllipsisButton
                        on:message={toggleToolbar}
                        dbName="Foo"
                        dbKey={tc.at} />
                </span>
            </CardTitle>
        </CardHeader>
        <CardBody>
            <div style="display: inline">
                {tc.timerName}
                <nbsp />
                {annotat(tc)}
            </div>
        </CardBody>
    </Card>
{/each}
