"use strict";
/*
params :{
    clearMS:3000,
    maxCarLenMS: 600,
    minCarLenMS: 300,
    maxPerfCount: 1,
    lanes: ["lane1","lane2"]
}
*/
function calcFinishMain(params, rawList) {
    const clearMicros = params.clearMS ? params.clearMS * 1000 : 3000 * 1000;
    const cBlocks = splitIntoCandidateBlocks(clearMicros, rawList);
    const finishList = cBlocks.map((cBlock) => mapValidFinish(params, cBlock));
}
function splitIntoCandidateBlocks(clearMicros, rawList) {
    const rc = [];
    var curBlock = {
        list: [],
        micros: 0,
    };
    for (index = 0; index < a.length; ++index) {
        const candidate = a[index];
        if (candidate.micros > curBlock.micros + clearMicros) {
            // flush curBlock
            if (curBlock.list && curBlock.list.length > 0) {
                rc.push(curBlock.list);
                curBlock.list = [];
                curBlock.micros = 0;
            }

            if (candidate.pinType === "lane") {
                curBlock.list.push(candidate);
                curBlock.micros = candidate.micros;
            }
        }
    }
    return rc;
}

function mapValidFinish(params, cBlock) {
    const finish = {
        valid: true,
        lanes: {},
        cBlock: cBlock,
    };
    params.lanes.forEach((lane) => {
        finish.lanes[lane] = getRawLaneFinish(lane, params, cBlock);
        if (finish.lanes[lane].error) {
            finish.valid = false;
        }
    });
    return finish;
}

function getRawLaneFinish(lane, params, cBlock) {
    const rlf = {
        valid: false,
    };
    const lanePins = cBlock.filter((piPin) => {
        piPin.lane === lane;
    });
    if (lanePins.length == 0) {
        rlf.error = "No data for lane";
        return rlf;
    }

    if (lanePins[0].micros - lanePins[0].microPrev < params.clearMicros) {
        rlf.error = "lane flickered before finish";
        return rlf;
    }

    // TODO: check state.  lanePins[0] s/b blocked
    // TODO: check state.  lanePins[last] s/b clear

    const perfCount = lanePins.length / 2 - 1; //divide by 2 for block/clear pair.  sub 1 for normal finish
    if (perfCount > params.maxPerfCount) {
        rlf.error = `perfCount [${perfCount}] > [${params.maxPerfCount}]`;
        return rlf;
    }

    rlf.noseMicros = lanePins[0].micros;
    rlf.tailMicros = lanePins[lanePins.length - 1].micros;

    rlf.carLenMicros = rlf.tailMicros - rlf.noseMicros;

    rlf.carLenMS = rlf.carLenMicros / 1000;
    if (rlf.carLenMS > params.maxCarLenMS) {
        rlf.error = `CarLen [${rlf.clearMS}] greater than [${params.maxCarLenMS}]`;
        return rlf;
    }

    if (rlf.carLenMS < params.minCarLenMS) {
        rlf.error = `CarLen [${rlf.clearMS}] less than [${params.minCarLenMS}]`;
        return rlf;
    }

    rlf.valid = true; // lools like a valid finish :-)
    return rlf;
}
