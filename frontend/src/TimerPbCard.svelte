<script>
    import log from "loglevel";
    import { tutorial as Timer } from "@rr1.us/timer_protobuf";
       import {
        fmtPinTime,
        getTimerPinActiveMS,
    } from "./utils.js";
export let timerPbConfig={}
export let cdBlock=[]
function getWinMessage(cdBlock){
    const rc=[]
    const l1nosePin=getOldest(cdBlock,Timer.PinState.BLOCKED,Timer.PinName.lane1)
    const l2nosePin=getOldest(cdBlock,Timer.PinState.BLOCKED,Timer.PinName.lane2)
    const l1tailPin=getNewest(cdBlock,Timer.PinState.CLEAR,Timer.PinName.lane1)
    const l2tailPin=getNewest(cdBlock,Timer.PinState.CLEAR,Timer.PinName.lane2)
    if(!l1nosePin){
        rc.push('❌ Missing lane 1 Nose')
    }
    if(!l2nosePin){
        rc.push('❌ Missing lane 2 Nose')
    }
    if(!l1tailPin){
        rc.push('❌ Missing lane 1 Tail')
    }
    if(!l2tailPin){
        rc.push('❌ Missing lane 2 Tail')
    }
    if(rc.length==0){
        auditLaneState(cdBlock,Timer.PinName.lane1,rc)
        auditLaneState(cdBlock,Timer.PinName.lane2,rc)
    }
    if(l1nosePin&&l2nosePin && l1tailPin && l2tailPin){
        const l1perf=getPerfCount(cdBlock,Timer.PinState.BLOCKED,Timer.PinName.lane1)
        const l2perf=getPerfCount(cdBlock,Timer.PinState.BLOCKED,Timer.PinName.lane2)

        const [l1noseMs]=getTimerPinActiveMS(l1nosePin)
        const [l2noseMs]=getTimerPinActiveMS(l2nosePin)
        const [l1tailMs]=getTimerPinActiveMS(l1tailPin)
        const [l2tailMs]=getTimerPinActiveMS(l2tailPin)
        const deltaMs=l2noseMs-l1noseMs
        const winLane=deltaMs>0?'L1':'L2'
        const l1lengthMs=l1tailMs-l1noseMs
        const l2lengthMs=l2tailMs-l2noseMs
        
        rc.push(`Winner: ${winLane}: ${Math.abs(deltaMs)}`)
        rc.push(`L1 length: ${l1lengthMs} perfs: ${l1perf}`)
        rc.push(`L2 length: ${l2lengthMs} perfs: ${l2perf}`)
        auditCarAttributes(l1lengthMs,l1perf,Timer.PinName.lane1,rc)
        auditCarAttributes(l2lengthMs,l2perf,Timer.PinName.lane2,rc)

    }
    return rc

}
function auditCarAttributes(lengthMs,perf,pinName,msgs){

    if(! timerPbConfig.timerConfigLanePhotoEye){
        msgs.push(`❌ missing timer config`)
        return
    }
    if(lengthMs<timerPbConfig.timerConfigLanePhotoEye.minCarLenMS){
        msgs.push(`❌ Lane${pinName} car length less than minimum.`)
    }
    if(lengthMs>timerPbConfig.timerConfigLanePhotoEye.maxCarLenMS){
        msgs.push(`❌ Lane${pinName} car length > maximum.`)
    }
    if(perf>timerPbConfig.timerConfigLanePhotoEye.maxPerfCount){
        msgs.push(`❌ Lane${pinName} perforations > maximum.`)
    }
}
function auditLaneState(cdBlock,pinName,msgs){
    const matchList=cdBlock.
            filter(tp=>tp.pinName==pinName)

    if(matchList[0].pinState != Timer.PinState.CLEAR){
        log.debug("cwaudit:", matchList[0].pinState, Timer.PinState.CLEAR);
        msgs.push(`❌ Bad final state Lane${pinName}.  Last entry should be "CLEAR"`)
    }
    if(matchList[matchList.length-1].pinState != Timer.PinState.BLOCKED){
        msgs.push(`❌️ Bad Initial state Lane${pinName}.  First entry should be "BLOCKED"`)
    }

}


function getMatches(cdBlock,pinState,pinName){
    const matchList=cdBlock.
            filter(tp=>tp.pinState==pinState).
            filter(tp=>tp.pinName==pinName)
    return matchList
}
function getPerfCount(cdBlock,pinState,pinName){
    const matchList=getMatches(cdBlock,pinState,pinName)
    if (matchList.length>0){
        return matchList.length-1
    }
    return -999//should not happen

}
function getNewest(cdBlock,pinState,pinName){
    const matchList=getMatches(cdBlock,pinState,pinName)
    if (matchList.length>0){
        return matchList[0]
    }
    return undefined
}
function getOldest(cdBlock,pinState,pinName){
    const matchList=getMatches(cdBlock,pinState,pinName)
    // s/b sorted by age
    if (matchList.length>0){
        return matchList[matchList.length-1]
    }
    return undefined

}
function isPinBlocked(timerPin) {
        log.debug("isPinBlocked:", timerPin);
        return timerPin.pinState == Timer.PinState.BLOCKED;
    }
    function getCdbHeader(cdBlock){
        if(cdBlock.length && cdBlock[0].xmitMs){
            //const [hdrMs]=getTimerPinActiveMS(cdBlock[0])
            const xmitDate = new Date(cdBlock[0].xmitMs).toLocaleString();
            log.debug('card:',cdBlock[0])
            //return(JSON.stringify(cdBlock))
            return `--- Candidate: ${xmitDate}`;
        }
        return('Candidate')
    }
</script>
<div>
    <code style="background-color:#bbb;">
        {getCdbHeader(cdBlock)}
    </code>
</div>

{#each getWinMessage(cdBlock) as msg, i}
    {msg}<br/>
{/each}
{#each cdBlock as tp, i}

    {#if (tp.ui==='timerPin')}
    <div>
        <code>
            {fmtPinTime(tp)} Lane{tp.pinName}
            {#if isPinBlocked(tp)}🔴 Blocked{:else}🟢 Clear{/if}
        </code>
    </div>
    {/if}
{/each}
