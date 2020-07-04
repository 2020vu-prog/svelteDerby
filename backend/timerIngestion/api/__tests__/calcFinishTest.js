"use strict";
const CalcFinish = require("../calcFinish.js");

const fs = require("fs");

const rawdata = fs.readFileSync("test.json");
const testJson = JSON.parse(rawdata);
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
    expect(calcFinish.calcFinishMain(testJson)).toStrictEqual([]);
});
