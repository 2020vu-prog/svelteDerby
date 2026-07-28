const path = require("path");

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

module.exports = {
    getSourceName,
};
