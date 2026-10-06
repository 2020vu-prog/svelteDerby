import { render, cleanup } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { writable } from "svelte/store";
import { Base64 } from "js-base64";
import { tutorial as Timer } from "@rr1.us/timer_protobuf";

vi.mock("#src/stores.js", () => ({ mqttMapData: writable({}) }));
vi.mock("#src/eventDb.js", () => ({ db: {} }));
vi.mock("#src/utils.js", () => ({
    getTimerPbConfig: vi.fn(),
    MqttMapSubscription: vi.fn(),
    MqttGetTopic: vi.fn((id) => `timers/${id}`),
}));

import TimerSubscribeStub from "#src/TimerSubscribeStub.svelte";
import { mqttMapData } from "#src/stores.js";
import { MqttMapSubscription } from "#src/utils.js";

const encode = (timerData) => ({
    b64: Base64.fromUint8Array(
        Timer.TimerDataList.encode(
            Timer.TimerDataList.create({ timerData })
        ).finish()
    ),
});
const pin = (pinName, pinState, tick64) => ({
    timerPin: { pinName, pinState, stamp: { tick64 } },
});

beforeEach(() => {
    vi.clearAllMocks();
    mqttMapData.set({});
});
afterEach(cleanup);

describe("TimerSubscribeStub", () => {
    it("subscribes to the timer's topic and passes the decoded data list to onTimerDataList", async () => {
        const onTimerDataList = vi.fn();
        render(TimerSubscribeStub, { timerId: "RR1-A", onTimerDataList });
        expect(MqttMapSubscription).toHaveBeenCalledWith("timers/RR1-A");

        mqttMapData.set({
            "timers/RR1-A": encode([
                pin(Timer.PinName.lane1, Timer.PinState.CLEAR, 7),
            ]),
        });
        await Promise.resolve();

        expect(onTimerDataList).toHaveBeenCalledTimes(1);
        const list = onTimerDataList.mock.calls[0][0];
        expect(list.timerData).toHaveLength(1);
        expect(list.timerData[0].timerPin.pinName).toBe(Timer.PinName.lane1);
    });

    it("does not repeat a message it has already delivered", async () => {
        const onTimerDataList = vi.fn();
        render(TimerSubscribeStub, { timerId: "RR1-A", onTimerDataList });
        const message = encode([
            pin(Timer.PinName.lane1, Timer.PinState.CLEAR, 7),
        ]);

        mqttMapData.set({ "timers/RR1-A": message });
        await Promise.resolve();
        mqttMapData.set({ "timers/RR1-A": { ...message } });
        await Promise.resolve();

        expect(onTimerDataList).toHaveBeenCalledTimes(1);
    });

    it("calls onVideoKey when a lane is blocked, throttled to one capture per 15 seconds", async () => {
        const onVideoKey = vi.fn();
        render(TimerSubscribeStub, { timerId: "RR1-A", onVideoKey });

        mqttMapData.set({
            "timers/RR1-A": encode([
                pin(Timer.PinName.lane1, Timer.PinState.BLOCKED, 123),
            ]),
        });
        await Promise.resolve();
        expect(onVideoKey).toHaveBeenCalledTimes(1);
        expect(onVideoKey).toHaveBeenCalledWith("MQTT-123");

        mqttMapData.set({
            "timers/RR1-A": encode([
                pin(Timer.PinName.lane2, Timer.PinState.BLOCKED, 456),
            ]),
        });
        await Promise.resolve();
        expect(onVideoKey).toHaveBeenCalledTimes(1); // throttled
    });

    it("does not ask for a capture when the lane is clear", async () => {
        const onVideoKey = vi.fn();
        render(TimerSubscribeStub, { timerId: "RR1-A", onVideoKey });

        mqttMapData.set({
            "timers/RR1-A": encode([
                pin(Timer.PinName.lane1, Timer.PinState.CLEAR, 5),
            ]),
        });
        await Promise.resolve();

        expect(onVideoKey).not.toHaveBeenCalled();
    });
});
