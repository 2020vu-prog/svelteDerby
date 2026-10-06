import { render, cleanup } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { writable, get } from "svelte/store";

vi.mock("#src/stores.js", () => ({ mqttMapData: writable({}) }));
vi.mock("#src/eventDb.js", () => ({ db: {} }));
vi.mock("#src/utils.js", () => ({ MqttMapSubscription: vi.fn() }));

import MqttSubscribeStub from "#src/MqttSubscribeStub.svelte";
import { mqttMapData } from "#src/stores.js";
import { MqttMapSubscription } from "#src/utils.js";

beforeEach(() => {
    vi.clearAllMocks();
    mqttMapData.set({});
});
afterEach(cleanup);

describe("MqttSubscribeStub", () => {
    it("subscribes to its topic and passes each message for it to onMqMessage", async () => {
        const onMqMessage = vi.fn();
        render(MqttSubscribeStub, {
            mqTopic: "derby/e1/video/Finish",
            onMqMessage,
        });
        expect(MqttMapSubscription).toHaveBeenCalledWith(
            "derby/e1/video/Finish"
        );
        expect(onMqMessage).not.toHaveBeenCalled();

        mqttMapData.set({ "derby/e1/video/Finish": { n: "Finish", t: 1 } });
        await Promise.resolve();

        expect(onMqMessage).toHaveBeenCalledTimes(1);
        expect(onMqMessage).toHaveBeenCalledWith({ n: "Finish", t: 1 });
    });

    it("ignores messages for other topics", async () => {
        const onMqMessage = vi.fn();
        render(MqttSubscribeStub, {
            mqTopic: "derby/e1/video/Finish",
            onMqMessage,
        });

        mqttMapData.set({ "derby/e1/video/Other": { n: "Other" } });
        await Promise.resolve();

        expect(onMqMessage).not.toHaveBeenCalled();
        expect(get(mqttMapData)).toHaveProperty("derby/e1/video/Other");
    });

    it("does not subscribe or call back without a topic", async () => {
        const onMqMessage = vi.fn();
        render(MqttSubscribeStub, { onMqMessage });

        mqttMapData.set({ "": { n: "x" } });
        await Promise.resolve();

        expect(MqttMapSubscription).not.toHaveBeenCalled();
        expect(onMqMessage).not.toHaveBeenCalled();
    });
});
