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
                    recalcLaneData(fbJson);
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
    function bySeq(a, b) {
        return a.timerConfig.seq - b.timerConfig.seq;
    }
    function fbHasGps(fb) {
        return fb && fb.gpsNoseMs && fb.gpsNoseMs.length > 0;
    }
    function recalcLaneData(finishBlocks) {
        laneData = [];
        const sortedFB = finishBlocks.sort(bySeq);
        var prevFB = {
            XXtimerConfig: {
                timerName: "none",
            },
        };
        sortedFB.forEach((fb) => {
            var flag1 = "";
            var flag2 = "";
            if (prevFB.timerConfig && fbHasGps(fb)) {
                laneData.push({
                    timer: "SplitTime",
                    l1: fb.gpsNoseMs[0] - prevFB.gpsNoseMs[0],
                    delta: prevFB.timerConfig.timerName,
                    l2: fb.gpsNoseMs[1] - prevFB.gpsNoseMs[1],
                });
            } else {
                prevFB = {}; //invalidate potential split
            }
            if (fbHasGps(fb)) {
                var delta = fb.gpsNoseMs[1] - fb.gpsNoseMs[0];
                const deltaObj = annotateDelta(delta);

                laneData.push({
                    timer: fb.timerConfig.timerName,
                    l1: fmtMsHHMMSS(fb.gpsNoseMs[0]),
                    l2: fmtMsHHMMSS(fb.gpsNoseMs[1]),
                    ...deltaObj,
                });

                prevFB = fb;
            } else {
                    const delta=(fb.rpiNoseMicros[1] - fb.rpiNoseMicros[0]) / 1000
                const deltaObj = annotateDelta(delta);
                laneData.push({
                    timer: fb.timerConfig.timerName,
                    l1: fb.rpiNoseMicros[0],
                    l2: fb.rpiNoseMicros[1],
                    ...deltaObj,
                });
            }
        });
    }
    function annotateDelta(delta) {
        const rc = {};
        if (delta == 0) {
            rc.delta = `Tie`;
        } else if (delta < 0) {
            rc.delta = `${Math.abs(delta)}`;
            rc.flag2 = "🏁";
        } else {
            rc.delta = `${Math.abs(delta)}`;
            rc.flag1 = "🏁";
        }

        return rc;
    }
    function fmtMsHHMMSS(ms) {
        let gpsDate = new Date(ms);
        return gpsDate.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            fractionalSecondDigits: 3,
        });
    }
    const finishBlocks = [
        {
            timerName: "hill",
            timerConfig: {
                timerName: "hill",
                timerMqttClientId: "TimerJan22Test",
                useGpsTime: true,
                orgId: "Test.cad81",
                orgIz: "Test",
                sensorLogic: "LanePhotoEyes",
                timerConfigLanePhotoEye: {
                    maxCarLenMS: 800,
                    minCarLenMS: 2,
                    maxPerfCount: 2,
                    clearMS: 5000,
                },
                maxTrackSeconds: 120,
                deleted: false,
                seq: 500,
            },
            events: [
                {
                    lane: "lane1",
                    noseTime: {
                        pinNumber: 17,
                        stamp: {
                            gpsTime: {
                                seconds: "1685586842",
                                nanos: 385190000,
                            },
                            tick64: "14797331264",
                        },
                        pinState: "BLOCKED",
                        pinName: "lane1",
                    },
                    tailTime: {
                        pinNumber: 17,
                        stamp: {
                            gpsTime: {
                                seconds: "1685586842",
                                nanos: 534019000,
                            },
                            tick64: "14797480094",
                        },
                        pinState: "CLEAR",
                        pinName: "lane1",
                    },
                    lanePairFound: true,
                },
                {
                    lane: "lane2",
                    noseTime: {
                        pinNumber: 22,
                        stamp: {
                            gpsTime: {
                                seconds: "1685586840",
                                nanos: 557179000,
                            },
                            tick64: "14795503249",
                        },
                        pinState: "BLOCKED",
                        pinName: "lane2",
                    },
                    tailTime: {
                        pinNumber: 22,
                        stamp: {
                            gpsTime: {
                                seconds: "1685586840",
                                nanos: 873719000,
                            },
                            tick64: "14795819790",
                        },
                        pinState: "CLEAR",
                        pinName: "lane2",
                    },
                    lanePairFound: true,
                },
            ],
            rpiNoseMicros: ["14797331264", "14795503249"],
            rpiDeltaTickMicros: -1828015,
            gpsAvailable: true,
            vvv: "20:04",
            gpsDeltaMicros: -1828011,
            gpsNoseMicros: ["1685586842385190", "1685586840557179"],
            gpsNoseMs: [1685586842385, 1685586840557],
        },
        {
            timerName: "Finish",
            timerConfig: {
                timerName: "Finish",
                timerMqttClientId: "IL-CHI-TIMER-20230521",
                useGpsTime: true,
                orgId: "Test.cad81",
                orgIz: "Test",
                sensorLogic: "LanePhotoEyes",
                timerConfigLanePhotoEye: {
                    maxCarLenMS: 800,
                    minCarLenMS: 2,
                    maxPerfCount: 2,
                    clearMS: 5000,
                },
                maxTrackSeconds: 180,
                deleted: false,
                seq: 888,
            },
            events: [
                {
                    lane: "lane1",
                    noseTime: {
                        pinNumber: 17,
                        stamp: {
                            gpsTime: {
                                seconds: "1685586856",
                                nanos: 317513000,
                            },
                            tick64: "55635875745",
                        },
                        pinState: "BLOCKED",
                        pinName: "lane1",
                    },
                    tailTime: {
                        pinNumber: 17,
                        stamp: {
                            gpsTime: {
                                seconds: "1685586856",
                                nanos: 538878000,
                            },
                            tick64: "55636097111",
                        },
                        pinState: "CLEAR",
                        pinName: "lane1",
                    },
                    lanePairFound: true,
                },
                {
                    lane: "lane2",
                    noseTime: {
                        pinNumber: 22,
                        stamp: {
                            gpsTime: {
                                seconds: "1685586857",
                                nanos: 240768000,
                            },
                            tick64: "55636799007",
                        },
                        pinState: "BLOCKED",
                        pinName: "lane2",
                    },
                    tailTime: {
                        pinNumber: 22,
                        stamp: {
                            gpsTime: {
                                seconds: "1685586857",
                                nanos: 524517000,
                            },
                            tick64: "55637082758",
                        },
                        pinState: "CLEAR",
                        pinName: "lane2",
                    },
                    lanePairFound: true,
                },
            ],
            rpiNoseMicros: ["55635875745", "55636799007"],
            rpiDeltaTickMicros: 923262,
            gpsAvailable: true,
            vvv: "20:04",
            gpsDeltaMicros: 923255,
            gpsNoseMicros: ["1685586856317513", "1685586857240768"],
            gpsNoseMs: [1685586856317, 1685586857240],
        },
    ];

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
    <Table striped>
        <thead>
            <tr>
                <th>Timer</th>
                <th>Lane1</th>
                <th>&nbsp;</th>
                <th>&lt;=&gt;</th>
                <th>&nbsp;</th>
                <th>Lane2</th>
            </tr>
        </thead>
        <tbody>
            {#each laneData as row (row.timer)}
                <tr>
                    <th scope="row">{row.timer}</th>
                    <td>{row.l1}</td>
                    <td>
                        {#if row.flag1}{row.flag1}{/if}
                    </td>
                    <td>{row.delta}</td>
                    <td>
                        {#if row.flag2}{row.flag2}{/if}
                    </td>
                    <td>{row.l2}</td>
                </tr>
            {/each}
        </tbody>
    </Table>
{/if}
