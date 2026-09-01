import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./paInfo.js", import.meta.url), "utf8");
const moduleUnderTest = await import(
    `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);

const {
    getCompletedRaceStatuses,
    getLatestCompletedStanding,
    getNextOnBlocksStatuses,
    getParticipant,
    getSoloCarNumber,
} = moduleUnderTest;

const formatWinTime = (value) => (value === "Tied" ? value : `${value} ms`);

test("selects the newest non-deleted standing with results", () => {
    const standings = {
        old: { at: 100, hasResults: () => true },
        pending: { at: 400, hasResults: () => false },
        deleted: { at: 500, del: true, hasResults: () => true },
        newest: { at: 300, hasResults: () => true },
    };

    assert.equal(getLatestCompletedStanding(standings), standings.newest);
    assert.equal(getLatestCompletedStanding({}), undefined);
});

test("looks up participant details by car number", () => {
    const driver = { number: "12", name: "Driver" };
    assert.equal(getParticipant({ 12: driver }, 12), driver);
    assert.equal(getParticipant({}, 12), undefined);
});

test("matches RacePhase current-phase winner status", () => {
    const phase = {
        phaseLiteral: "B",
        getPhaseDeltaMS: () => 125,
        isWinner: (lane) => lane === 1,
    };

    assert.deepEqual(getNextOnBlocksStatuses(phase, 1, {}, formatWinTime), [
        { label: "B: 125 ms", winner: true },
    ]);
    assert.deepEqual(getNextOnBlocksStatuses(phase, 2, {}, formatWinTime), []);
});

test("matches RacePhase prior A-phase status for blocks", () => {
    const phase = {
        phaseLiteral: "B",
        rs: "standing-1",
        isWinner: () => false,
    };
    const standings = { "standing-1": { phase1DeltaMS: -75 } };

    assert.deepEqual(
        getNextOnBlocksStatuses(phase, 1, standings, formatWinTime),
        [{ label: "A: 75 ms", winner: true }]
    );
    assert.deepEqual(
        getNextOnBlocksStatuses(phase, 2, standings, formatWinTime),
        []
    );
});

test("finds the sole car regardless of which lane it's in", () => {
    assert.equal(getSoloCarNumber({ carNumbers: ["772", ""] }), "772");
    assert.equal(getSoloCarNumber({ carNumbers: ["", "772"] }), "772");
    assert.equal(getSoloCarNumber({ carNumbers: ["101", "102"] }), undefined);
    assert.equal(getSoloCarNumber({ carNumbers: ["", ""] }), undefined);
    assert.equal(getSoloCarNumber({ carNumbers: [] }), undefined);
    assert.equal(getSoloCarNumber(undefined), undefined);
});

test("matches RaceStanding overall and phase winner statuses", () => {
    const standing = {
        isWinner: (lane, phase) => lane === 2 && (phase === 0 || phase === 2),
        getWinTime: (_lane, phase) => (phase === 0 ? 40 : 90),
    };

    assert.deepEqual(getCompletedRaceStatuses(standing, 2, formatWinTime), [
        { label: "Overall: 40 ms", winner: true },
        { label: "B: 90 ms", winner: false },
    ]);
});
