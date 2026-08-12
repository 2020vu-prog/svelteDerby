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
