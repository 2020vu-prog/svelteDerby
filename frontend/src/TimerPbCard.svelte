<script>
    import log from "loglevel";
    import { tutorial as Timer } from "@rr1.us/timer_protobuf";
    import {
        fmtPinTime,
        getTimerPinActiveMS,
        protobufLongToNumber,
    } from "./utils.js";
    import Annotate from "./Annotate.svelte";
    import { nextOnBlockKey, pushMessage, racePhaseMap } from "./stores.js";
    import { push } from "svelte-spa-router";
    export let timerPbConfig = {};
    export let cdBlock = [];
    function getWinMessage(cdBlock) {
        const rc = [];
        const [l1noseMs, l1Src] = calcCarAttributes(
            rc,
            cdBlock,
            Timer.PinName.lane1
        );
        const [l2noseMs, l2Src] = calcCarAttributes(
            rc,
            cdBlock,
            Timer.PinName.lane2
        );
        if (l1Src && l2Src) {
            const deltaMs = l2noseMs - l1noseMs;
            const winLane = deltaMs > 0 ? "L1" : "L2";
            rc.push(`Winner: ${winLane}: ${Math.abs(deltaMs)}`);
        }
        return rc;
    }
    function calcCarAttributes(rc, cdBlock, pinName) {
        const laneLit = `Lane${pinName}`;
        const perfCount = getPerfCount(
            cdBlock,
            Timer.PinState.BLOCKED,
            pinName
        );

        const lXnosePin = getOldest(cdBlock, Timer.PinState.BLOCKED, pinName);
        const lXtailPin = getNewest(cdBlock, Timer.PinState.CLEAR, pinName);
        const missing = [];
        if (!lXnosePin) {
            missing.push("Nose");
        }
        if (!lXtailPin) {
            missing.push("Tail");
        }
        if (missing.length === 0) {
            auditLaneState(cdBlock, pinName, rc);
            const [lXnoseMs, noseSrc] = getTimerPinActiveMS(lXnosePin);
            const [lXtailMs, tailSrc] = getTimerPinActiveMS(lXtailPin);
            const lXlengthMs = lXtailMs - lXnoseMs;
            //rc.push(`${laneLit} length: ${lXlengthMs} perfs: ${perfCount}`)
            auditCarAttributes(lXlengthMs, perfCount, pinName, rc);
            return [lXnoseMs, noseSrc];
        } else {
            rc.push(`❌ Missing ${laneLit} [${missing}]`);
        }
        return [];
    }
    function auditCarAttributes(lengthMs, perf, pinName, msgs) {
        const laneLit = `Lane${pinName}`;
        if (!timerPbConfig.timerConfigLanePhotoEye) {
            msgs.push(`❌ missing timer config`);
            return;
        }
        let lenEmoji = "✅";
        let perfEmoji = "✅";
        // 1❌: too small
        // 2❌: too big
        if (lengthMs < timerPbConfig.timerConfigLanePhotoEye.minCarLenMS) {
            lenEmoji = "❌";
        }
        if (lengthMs > timerPbConfig.timerConfigLanePhotoEye.maxCarLenMS) {
            lenEmoji = "❌❌";
        }
        if (perf > timerPbConfig.timerConfigLanePhotoEye.maxPerfCount) {
            perfEmoji = "❌";
        }

        msgs.push(
            `${laneLit} length${lenEmoji}: ${lengthMs} perfs${perfEmoji}: ${perf}`
        );
    }
    function auditLaneState(cdBlock, pinName, msgs) {
        const matchList = cdBlock.filter((tp) => tp.pinName == pinName);

        if (matchList[0].pinState != Timer.PinState.CLEAR) {
            log.debug("cwaudit:", matchList[0].pinState, Timer.PinState.CLEAR);
            msgs.push(
                `❌ Bad final state Lane${pinName}.  Last entry should be "CLEAR"`
            );
        }
        if (
            matchList[matchList.length - 1].pinState != Timer.PinState.BLOCKED
        ) {
            msgs.push(
                `❌️ Bad Initial state Lane${pinName}.  First entry should be "BLOCKED"`
            );
        }
    }

    function getMatches(cdBlock, pinState, pinName) {
        const matchList = cdBlock
            .filter((tp) => tp.pinState == pinState)
            .filter((tp) => tp.pinName == pinName);
        return matchList;
    }
    function getPerfCount(cdBlock, pinState, pinName) {
        const matchList = getMatches(cdBlock, pinState, pinName);
        if (matchList.length > 0) {
            return matchList.length - 1;
        }
        return -999; //should not happen
    }
    function getNewest(cdBlock, pinState, pinName) {
        const matchList = getMatches(cdBlock, pinState, pinName);
        if (matchList.length > 0) {
            return matchList[0];
        }
        return undefined;
    }
    function getOldest(cdBlock, pinState, pinName) {
        const matchList = getMatches(cdBlock, pinState, pinName);
        // s/b sorted by age
        if (matchList.length > 0) {
            return matchList[matchList.length - 1];
        }
        return undefined;
    }
    function isPinBlocked(timerPin) {
        log.debug("isPinBlocked:", timerPin);
        return timerPin.pinState == Timer.PinState.BLOCKED;
    }
    function getCdbHeader(cdBlock) {
        if (cdBlock.length && cdBlock[0].xmitMs) {
            //const [hdrMs]=getTimerPinActiveMS(cdBlock[0])
            const xmitDate = new Date(
                protobufLongToNumber(cdBlock[0].xmitMs)
            ).toLocaleString();
            log.debug("card:", cdBlock[0]);
            //return(JSON.stringify(cdBlock))
            return `--- Candidate: ${xmitDate}`;
        }
        return "Candidate";
    }
    function getCandidateWin(cdBlock) {
        const [l1noseMs, l1Src] = getCandidateNose(
            cdBlock,
            Timer.PinName.lane1
        );
        const [l2noseMs, l2Src] = getCandidateNose(
            cdBlock,
            Timer.PinName.lane2
        );
        if (!l1Src || !l2Src) {
            return undefined;
        }
        const deltaMs = l2noseMs - l1noseMs;
        return {
            winningLane: deltaMs > 0 ? 1 : 2,
            winningTime: Math.round(Math.abs(deltaMs)),
        };
    }
    function getCandidateNose(cdBlock, pinName) {
        const nosePin = getOldest(cdBlock, Timer.PinState.BLOCKED, pinName);
        if (!nosePin) {
            return [];
        }
        return getTimerPinActiveMS(nosePin);
    }
    function getApplyTimeRoute(cdBlock) {
        const candidateWin = getCandidateWin(cdBlock);
        const nextOnBlockRacePhase = $racePhaseMap[$nextOnBlockKey];
        if (!$nextOnBlockKey || !nextOnBlockRacePhase || !candidateWin) {
            return "";
        }
        return `/ManualTimerAdd/${encodeURIComponent($nextOnBlockKey)}/${
            candidateWin.winningLane
        }/${encodeURIComponent(candidateWin.winningTime)}`;
    }
    function getCandidateMenu(cdBlock) {
        const applyTimeRoute = getApplyTimeRoute(cdBlock);
        return [
            {
                text: "Apply Time",
                onClick: () => {
                    if (applyTimeRoute) {
                        push(applyTimeRoute);
                    } else {
                        pushMessage({
                            text: "No race is currently on blocks.",
                            type: "error",
                        });
                    }
                },
            },
            /*
            {
                text: "Log candidate",
                onClick: () => log.info("TimerPbCard candidate:", cdBlock),
            },
            {
                text: "Sample disabled",
                disabled: true,
            },
	    */
        ];
    }
</script>

<Annotate text={getCdbHeader(cdBlock)} menu={getCandidateMenu(cdBlock)} />

{#each getWinMessage(cdBlock) as msg, i}
    {msg}<br />
{/each}
{#each cdBlock as tp, i}
    {#if tp.ui === "timerPin"}
        <div>
            <code>
                {fmtPinTime(tp)} Lane{tp.pinName}
                {#if isPinBlocked(tp)}🔴 Blocked{:else}🟢 Clear{/if}
            </code>
        </div>
    {/if}
{/each}
