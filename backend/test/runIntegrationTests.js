"use strict";

const { randomUUID } = require("crypto");
const { spawnSync } = require("child_process");
const path = require("path");

const nodeModules = path.resolve(__dirname, "node_modules");
const result = spawnSync(
    path.join(nodeModules, ".bin/jest"),
    [
        "auth.test.js",
        "bulk.test.js",
        "derbyMain.integration.test.js",
        "timerInit.test.js",
        "main.test.js",
        "--runInBand",
        "--bail",
    ],
    {
        cwd: __dirname,
        env: {
            ...process.env,
            DERBY_INTEGRATION_RUN_ID: randomUUID().substring(0, 5),
            DERBY_INTEGRATION_TIMESTAMP: new Date().toISOString(),
            NODE_PATH: nodeModules,
        },
        stdio: "inherit",
    }
);

process.exit(result.status ?? 1);
