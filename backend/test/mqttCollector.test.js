const fs = require("fs");
const path = require("path");
const MqttCollector = require("./mqttCollector.js");

test("finds collected payloads and reports missing expectations", async () => {
    const collector = new MqttCollector();
    collector.messages.push({
        index: 0,
        payload: { PK: "event:RS", SK: "heat:01" },
        receivedAt: Date.now(),
        topic: "derby/event/dist",
    });
    const found = {
        name: "heat 1",
        predicate: (message) => message.SK === "heat:01",
    };
    const absent = {
        name: "heat 3",
        predicate: (message) => message.SK === "heat:03",
    };

    expect(collector.find(found.predicate).index).toBe(0);
    await expect(collector.waitForAll([found], 1)).resolves.toEqual([]);
    await expect(collector.waitForAll([found, absent], 1)).resolves.toEqual([
        absent,
    ]);
});

test("logs received messages in arrival order as JSON Lines", () => {
    const logFilePath = path.join(
        "/tmp",
        `mqtt-collector-test-${process.pid}.jsonl`
    );
    const collector = new MqttCollector({ logFilePath });

    try {
        collector.recordMessage("derby/event/dist", Buffer.from('{"SK":"01"}'));
        collector.recordMessage("derby/event/dist", Buffer.from('{"SK":"02"}'));

        const records = fs
            .readFileSync(logFilePath, "utf8")
            .trim()
            .split("\n")
            .map(JSON.parse);
        expect(records.map((record) => record.payload.SK)).toEqual([
            "01",
            "02",
        ]);
        expect(records.map((record) => record.index)).toEqual([0, 1]);
    } finally {
        fs.rmSync(logFilePath, { force: true });
    }
});

test("diagnostic example contains ordered valid JSON Lines", () => {
    const records = fs
        .readFileSync(
            path.join(__dirname, "fixtures/mqtt-messages.example.jsonl"),
            "utf8"
        )
        .trim()
        .split("\n")
        .map(JSON.parse);

    expect(records).toHaveLength(57);
    expect(records.map((record) => record.index)).toEqual(
        Array.from({ length: 57 }, (_, index) => index)
    );
    expect(records.every((record) => record.type === "message")).toBe(true);
    expect(
        records.every((record) => record.topic === "derby/Test.e5fd0/dist")
    ).toBe(true);
});
