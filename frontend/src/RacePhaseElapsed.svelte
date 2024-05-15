<script>
    import log from "loglevel";
    import {
        Card,
        CardBody,
        CardHeader,
        CardTitle,
        CardFooter,
        Badge,
        Table,
    } from "sveltestrap";
    import { recalcLaneData} from './utilsElapsed.js'
    import { fmtPinTime } from "./utils.js";
    import { onMount } from "svelte";
    import { sleep } from "./utils.js";
    import { statusMessage, raceConfig, axios } from "./stores";

    export let params = {};
    let sampleDemoData = true;
    let rpKey = "";
    let spinning = true;
    onMount(async () => {
        log.debug("RacePhaseElapsed:", params);
        //recalcLaneData(finishBlocks);
        rpKey = params.rpKey;
        await loadFinishBlocks();
    });
    async function loadFinishBlocks() {
        const orgIz = $raceConfig.orgIz;
        const orgId = $raceConfig.orgId;

        const url = `/getPhaseElapsed?orgIz=${orgIz}&orgId=${orgId}&sk=${rpKey}`;
        try {
            await sleep(1);
            const response = await $axios.get($raceConfig.baseUrl + url);
            spinning = false;
            if (response.error) {
                log.debug("loadFinishBlocks:", response);
                //TODO: not working!?
                $statusMessage = {
                    text: `loadFinishBlocks api Failed: ${response.error}.`,
                    type: "error",
                };
            } else {
                /*
                $statusMessage = {
                    text: `getTimerHistory Complete.`,
                    type: "success",
                };
                */

                const fbList = response.data.fbList;
                log.debug("fbList: ", fbList);
                if (fbList) {
                    const fbJson = JSON.parse(fbList);
                    log.debug("fbJson: ", fbJson);
                    log.debug("fb cn : ", response.data.cn);
                    [laneData]=recalcLaneData(fbJson, response.data.cn);
                    sampleDemoData = false;
                }
            }
        } catch (err) {
            $statusMessage = {
                text: `loadFinishBlocks calc Failed: ${err}.`,
                type: "error",
            };
            log.error(`loadFinishBlocks calc Failed:`, err);
        }
    }
    var laneData = [
        {
            timer: "Ramps",
            l1: 123,
            delta: "-",
            l2: 123,
        },
        {
            timer: "Hill ",
            l1: 456.77,
            delta: ".010 *",
            l2: 456.78,
        },
        {
            timer: "Finish",
            l1: 887.655,
            delta: ".020 *",
            l2: 887.657,
        },
    ];
</script>

{#if spinning}
    <div>
        Spinning!
        <img alt="spinner" src="data/circles.svg" width="250px" />
    </div>
{:else}
    {#if sampleDemoData}
        <h1 style="color:red">SAMPLE -- DEMO DATA</h1>
    {/if}
    <Table striped bordered size="sm">
        <thead>
            <tr>
                <th>Timer</th>
                <th>&nbsp;</th>
                <th>Lane1</th>
                <th>&lt;=&gt;</th>
                <th>Lane2</th>
                <th>&nbsp;</th>
            </tr>
        </thead>
        <tbody>
            {#each laneData as row (row.timer)}
                <tr>
                    <th scope="row" style={row.nameStyle}>{row.timer} </th>
                    <td>
                        {#if row.flag1}{row.flag1}{/if}
                    </td>
                    <td>{row.l1}</td>
                    <td>{row.delta}</td>
                    <td>{row.l2}</td>
                    <td>
                        {#if row.flag2}{row.flag2}{/if}
                    </td>
                </tr>
            {/each}
        </tbody>
    </Table>
{/if}
