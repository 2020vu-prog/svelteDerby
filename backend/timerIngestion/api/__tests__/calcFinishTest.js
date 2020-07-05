"use strict";
const CalcFinish = require("../calcFinish.js");

const fs = require("fs");

const testJson = JSON.parse(fs.readFileSync("./__tests__/test.json"));
const basementJson = JSON.parse(fs.readFileSync("./__tests__/basement.json"));
const timerConfig = {
    clearMS: 3000,
    maxCarLenMS: 600,
    minCarLenMS: 300,
    maxPerfCount: 1,
    lanes: ["lane1", "lane2"],
};
const calcFinish = new CalcFinish(timerConfig);
test("handle empty input", () => {
    expect(calcFinish.calcFinishMain([])).toStrictEqual([]);
});

test("handle json input", () => {
    const out = calcFinish.calcFinishMain(testJson);
    //expect(out).toStrictEqual([]);
    expect(out.length).toStrictEqual(1); // WIP, test is broken
});
test("test basement json", () => {
    const candidates = calcFinish.calcFinishMain(basementJson);
    expect(candidates.length).toStrictEqual(1);
    const candidate = candidates[0];
    console.log("l1:", candidate);
    expect(candidate.lanes.lane1.valid).toStrictEqual(true);
    expect(candidate.lanes.lane2.valid).toStrictEqual(true);
    const w =
        candidate.lanes.lane1.noseMicros - candidate.lanes.lane2.noseMicros;
    expect(w).toStrictEqual(-23115);
    //expect(candidates).toStrictEqual([]); // WIP, test is broken});
});
test("test basement json with large MinCarLen", () => {
    const tcMin = Object.assign({}, timerConfig);
    tcMin.minCarLenMS = 3000;
    const calcFinish = new CalcFinish(tcMin);

    const candidates = calcFinish.calcFinishMain(basementJson);
    expect(candidates.length).toStrictEqual(1);
    const candidate = candidates[0];
    console.log("l1:", candidate);
    expect(candidate.lanes.lane1.valid).toStrictEqual(true);
    expect(candidate.lanes.lane2.valid).toStrictEqual(true);
    const w =
        candidate.lanes.lane1.noseMicros - candidate.lanes.lane2.noseMicros;
    expect(w).toStrictEqual(-23115);
    //expect(candidates).toStrictEqual([]); // WIP, test is broken});
});
