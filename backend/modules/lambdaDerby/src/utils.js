const path = require("path");
const crypto = require("crypto");

function getSourceName() {
    const stackLine =
        new Error().stack
            .split("\n")
            .slice(1)
            .find((line) => !line.includes(" at getSourceName ")) || "";
    // Node stack frames appear as either "at fn (file:line:col)" or
    // "at file:line:col"; capture the function and file when present.
    const match =
        stackLine.match(/at (.*?) \((.*):\d+:\d+\)$/) ||
        stackLine.match(/at (.*):\d+:\d+$/);
    const fnName = match ? match[1].split(".").pop() : "";
    const filename = match ? match[2] || match[1] : "";
    return `${path.basename(filename)}:${fnName}`;
}

function getShaCars(seed, carList) {
    const shaMap = {};

    carList.forEach((carNumber) => {
        const seededCar = `${carNumber}:${seed}`;
        const sha = crypto.createHash("sha256").update(seededCar).digest("hex");
        shaMap[sha] = carNumber;
    });

    return Object.keys(shaMap)
        .sort()
        .map((shaKey) => shaMap[shaKey]);
}

module.exports = {
    getSourceName,
    getShaCars,
};
