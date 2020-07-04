"use strict";
/*
timerConfig :{
    clearMS:3000,
    maxCarLenMS: 600,
    minCarLenMS: 300,
    maxPerfCount: 1,
    lanes: ["lane1","lane2"]
}
*/
class CalcFinish {
    timerConfig = {};
    constructor(timerConfig) {
        this.timerConfig = timerConfig;
        this.clearMicros = this.timerConfig.clearMS
            ? this.timerConfig.clearMS * 1000
            : 3000 * 1000;
    }
    calcFinishMain(rawList) {
        const cBlocks = this.splitIntoCandidateBlocks(rawList);
        const finishList = cBlocks.map((cBlock) => this.mapValidFinish(cBlock));
        return finishList;
    }
    splitIntoCandidateBlocks(rawList) {
        const rc = [];
        var curBlock = {
            list: [],
            micros: 0,
        };
        for (var index = 0; index < rawList.length; ++index) {
            const candidate = rawList[index];
            if (candidate.micros > curBlock.micros + this.clearMicros) {
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

    mapValidFinish(cBlock) {
        const finish = {
            valid: true,
            lanes: {},
            cBlock: cBlock,
        };
        this.timerConfig.lanes.forEach((lane) => {
            finish.lanes[lane] = this.getRawLaneFinish(lane, cBlock);
            if (finish.lanes[lane].error) {
                finish.valid = false;
            }
        });
        return finish;
    }

    getRawLaneFinish(lane, cBlock) {
        const rlf = {
            valid: false,
        };
        const lanePins = cBlock.filter((piPin) => {
            piPin.pinName === lane;
        });
        if (lanePins.length == 0) {
            rlf.error = "No data for lane";
            return rlf;
        }

        if (lanePins[0].micros - lanePins[0].microPrev < this.clearMicros) {
            rlf.error = "lane flickered before finish";
            return rlf;
        }

        // TODO: check state.  lanePins[0] s/b blocked
        // TODO: check state.  lanePins[last] s/b clear

        const perfCount = lanePins.length / 2 - 1; //divide by 2 for block/clear pair.  sub 1 for normal finish
        if (perfCount > this.timerConfig.maxPerfCount) {
            rlf.error = `perfCount [${perfCount}] > [${this.timerConfig.maxPerfCount}]`;
            return rlf;
        }

        rlf.noseMicros = lanePins[0].micros;
        rlf.tailMicros = lanePins[lanePins.length - 1].micros;

        rlf.carLenMicros = rlf.tailMicros - rlf.noseMicros;

        rlf.carLenMS = rlf.carLenMicros / 1000;
        if (rlf.carLenMS > this.timerConfig.maxCarLenMS) {
            rlf.error = `CarLen [${rlf.clearMS}] greater than [${this.timerConfig.maxCarLenMS}]`;
            return rlf;
        }

        if (rlf.carLenMS < this.timerConfig.minCarLenMS) {
            rlf.error = `CarLen [${rlf.clearMS}] less than [${this.timerConfig.minCarLenMS}]`;
            return rlf;
        }

        rlf.valid = true; // lools like a valid finish :-)
        return rlf;
    }
}
module.exports = CalcFinish;
