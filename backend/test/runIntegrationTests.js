"use strict";

const { randomUUID } = require("crypto");
const { spawn } = require("child_process");
const path = require("path");
const { getAwsConfig } = require("./deploymentConfig.js");
const MqttCollector = require("./mqttCollector.js");

const nodeModules = path.resolve(__dirname, "node_modules");
const runId = randomUUID().substring(0, 5);
const orgId = `Test.${runId}`;
const mqttTopic = `derby/${orgId}/dist`;
const expectedMqttMessageCount = 57;

function runJest(env) {
    return new Promise((resolve, reject) => {
        const child = spawn(
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
            { cwd: __dirname, env, stdio: "inherit" }
        );
        child.once("error", reject);
        child.once("exit", (code) => resolve(code ?? 1));
    });
}

async function validateMqttMessages(collector) {
    const chartHeat = (message, heatNumber) =>
        message.PK === `${orgId}:Bp` && message.SK.endsWith(`:${heatNumber}`);
    const expectations = [
        {
            name: "event configuration",
            predicate: (message) =>
                message.PK === "EventConfig" && message.orgId === orgId,
        },
        {
            name: "participant 333",
            predicate: (message) =>
                message.PK === `${orgId}:PTCP` && message.SK === "333",
        },
        {
            name: "completed chart heat 1",
            predicate: (message) =>
                message.PK === `${orgId}:RS` &&
                message.SK.endsWith(":01") &&
                Boolean(message.ph1) &&
                Boolean(message.ph2),
        },
        {
            name: "winner 100 in heat 3",
            predicate: (message) =>
                chartHeat(message, "03") && message.pos?.A?.ptcp === "100",
        },
        {
            name: "loser 109 in heat 7",
            predicate: (message) =>
                chartHeat(message, "07") && message.pos?.A?.ptcp === "109",
        },
        {
            name: "updated shared event",
            predicate: (message) =>
                message.PK === "EventConfig" &&
                message.orgId === orgId &&
                message.name?.startsWith("derbyMain integration updated"),
        },
    ];
    const missing = await collector.waitForAll(expectations);

    if (collector.parseErrors.length > 0) {
        throw new Error(
            `MQTT JSON parse errors: ${collector.parseErrors.length}`
        );
    }
    if (collector.messages.some((message) => message.topic !== mqttTopic)) {
        throw new Error("MQTT collector received an unexpected topic");
    }
    if (collector.messages.some((message) => message.payload.orgId !== orgId)) {
        throw new Error("MQTT collector received an unexpected orgId");
    }
    if (missing.length > 0) {
        throw new Error(
            `Missing MQTT messages: ${missing.map(({ name }) => name).join(", ")}`
        );
    }
    if (collector.messages.length !== expectedMqttMessageCount) {
        console.warn(
            `Expected ${expectedMqttMessageCount} MQTT messages, received ${collector.messages.length}. See ${collector.logFilePath}`
        );
    }
}

async function main() {
    const env = {
        ...process.env,
        DERBY_INTEGRATION_RUN_ID: runId,
        DERBY_INTEGRATION_TIMESTAMP: new Date().toISOString(),
        NODE_PATH: nodeModules,
    };
    const collector = new MqttCollector();
    const config = await getAwsConfig();
    await collector.connect({
        config,
        topic: mqttTopic,
        clientId: `derby-it-${orgId}-${randomUUID().substring(0, 8)}`,
    });
    console.log(`MQTT message log: ${collector.logFilePath}`);

    let exitCode = 1;
    try {
        exitCode = await runJest(env);
        if (exitCode === 0) await validateMqttMessages(collector);
    } finally {
        await collector.disconnect();
    }
    return exitCode;
}

main()
    .then((exitCode) => process.exit(exitCode))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
