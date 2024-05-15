
    function bySeq(a, b) {
        return a.timerConfig.seq - b.timerConfig.seq;
    }
    function fbHasGps(fb) {
        return fb && fb.gpsNoseMs && fb.gpsNoseMs.length > 0;
    }
    const calcStyle = "color:ForestGreen;";
    export function recalcLaneData(finishBlocks, cnList) {
        const laneData = [];
        const fmap={
            l1:{},
            l2:{},
        };
        if (cnList) {
            laneData.push({
                timer: "Car #",
                l1: cnList[0],
                l2: cnList[1],
                delta: "",
            });
            fmap.l1['001_Car']=cnList[0]
            fmap.l2['001_Car']=cnList[1]
        }
            fmap.l1['000_Lane']='1'
            fmap.l2['000_Lane']='2'
        const sortedFB = finishBlocks.sort(bySeq);
        var prevFB = {
            XXtimerConfig: {
                timerName: "none",
            },
        };
        const calcElapsed = (laneIndex, sortedFB) => {
            let min = Number.MAX_SAFE_INTEGER;
            let max = 0;
            sortedFB.forEach((fb) => {
                if (fbHasGps(fb) && fb.gpsNoseMs[laneIndex]) {
                    min = Math.min(min, fb.gpsNoseMs[laneIndex]);
                    max = Math.max(max, fb.gpsNoseMs[laneIndex]);
                    //console.log(`min ${min} max: ${max}`)
                }
            });
            if (max > min) {
                return `${((max - min) / 1000).toFixed(3)}`;
            }
            return "";
        };
        const calcSplit = (nose, prevNose) => {
            if (!nose) return "";
            if (!prevNose) return "";
            return (nose - prevNose) / 1000;
        };

        sortedFB.forEach((fb) => {
            var flag1 = "";
            var flag2 = "";
            if (prevFB.timerConfig && fbHasGps(fb)) {
                    const l1s= calcSplit(fb.gpsNoseMs[0], prevFB.gpsNoseMs[0])
                    const l2s= calcSplit(fb.gpsNoseMs[1], prevFB.gpsNoseMs[1])
                laneData.push({
                    nameStyle: calcStyle,
                    timer: "Split",
                    l1: l1s,
                    //delta: prevFB.timerConfig.timerName,
                    delta: "",
                    l2: l2s,
                });
                fmap.l1[`${fb.timerConfig.seq}_Split_${fb.timerConfig.timerName}`]=l1s
                fmap.l2[`${fb.timerConfig.seq}_Split_${fb.timerConfig.timerName}`]=l2s
            } else {
                prevFB = {}; //invalidate potential split
            }
            if (fbHasGps(fb)) {
                var delta = NaN;
                if (fb.gpsNoseMs[1] && fb.gpsNoseMs[0]) {
                    delta = fb.gpsNoseMs[1] - fb.gpsNoseMs[0];
                }
                const deltaObj = annotateDelta(delta);

                laneData.push({
                    timer: fb.timerConfig.timerName,
                    l1: fmtMsHHMMSS(fb.gpsNoseMs[0]),
                    l2: fmtMsHHMMSS(fb.gpsNoseMs[1]),
                    ...deltaObj,
                });
                fmap.l1[`${fb.timerConfig.seq}_Time_${fb.timerConfig.timerName}`]=fmtMsHHMMSS(fb.gpsNoseMs[0])
                fmap.l2[`${fb.timerConfig.seq}_Time_${fb.timerConfig.timerName}`]=fmtMsHHMMSS(fb.gpsNoseMs[1]),

                prevFB = fb;
            } else {
                //no gps

                const delta =
                    (fb.rpiNoseMicros[1] - fb.rpiNoseMicros[0]) / 1000;
                const deltaObj = annotateDelta(delta);
                laneData.push({
                    timer: fb.timerConfig.timerName,
                    l1: fb.rpiNoseMicros[0],
                    l2: fb.rpiNoseMicros[1],
                    ...deltaObj,
                });
            }
        });

        laneData.push({
            nameStyle: calcStyle,
            timer: "Elapsed",
            l1: calcElapsed(0, sortedFB),
            //delta: prevFB.timerConfig.timerName,
            delta: "",
            l2: calcElapsed(1, sortedFB),
        });
            fmap.l1['010_Elapsed']=calcElapsed(0, sortedFB)
            fmap.l2['010_Elapsed']=calcElapsed(1, sortedFB)
                    console.log(`fmap `, fmap )
        return [laneData,fmap]
    }
    function annotateDelta(delta) {
        const rc = {
            delta: "",
        };
        if (isNaN(delta)) {
            return rc; //stand down
        }
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
        if (!ms) {
            return "";
        }
        if (ms == 2) {
            //hard-coded 'no gps?'
            return "";
        }
        let gpsDate = new Date(ms);
        return gpsDate.toLocaleTimeString([], {
            hour12: false, //AM PM format wastes space
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
