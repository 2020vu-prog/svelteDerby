"use strict";

const axios = require("axios");
const mqtt = require("mqtt");

class MqttCollector {
    constructor() {
        this.client = null;
        this.messages = [];
        this.parseErrors = [];
    }

    async connect({ config, topic, clientId }) {
        const response = await axios.get(config.mqtt_ps_url, {
            headers: { "x-invoke-key": config.mqtt_ps_key },
        });
        if (!response.data.url) {
            throw new Error("MQTT signer did not return a URL");
        }
        this.client = mqtt.connect(response.data.url, {
            clean: true,
            clientId,
            connectTimeout: 10000,
            reconnectPeriod: 0,
        });
        this.client.on("message", (receivedTopic, payload) => {
            try {
                this.messages.push({
                    index: this.messages.length,
                    payload: JSON.parse(payload.toString("utf8")),
                    receivedAt: Date.now(),
                    topic: receivedTopic,
                });
            } catch (error) {
                this.parseErrors.push({
                    error: error.message,
                    payload: payload.toString("utf8"),
                    topic: receivedTopic,
                });
            }
        });

        await new Promise((resolve, reject) => {
            this.client.once("connect", resolve);
            this.client.once("error", reject);
        });
        await new Promise((resolve, reject) => {
            this.client.subscribe(topic, { qos: 0 }, (error) => {
                if (error) reject(error);
                else resolve();
            });
        });
    }

    find(predicate) {
        return this.messages.find((message) => predicate(message.payload));
    }

    async waitForAll(expectations, timeoutMs = 3000) {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const missing = expectations.filter(
                (expectation) => !this.find(expectation.predicate)
            );
            if (missing.length === 0) return [];
            await new Promise((resolve) => setTimeout(resolve, 50));
        }
        return expectations.filter(
            (expectation) => !this.find(expectation.predicate)
        );
    }

    async disconnect() {
        if (!this.client) return;
        await new Promise((resolve) => this.client.end(false, {}, resolve));
        this.client = null;
    }
}

module.exports = MqttCollector;
