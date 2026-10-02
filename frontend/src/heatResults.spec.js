import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./eventDb.js", () => ({
    db: {},
    localConfigDb: {},
    putUserPreference: vi.fn(),
    getUserPreference: vi.fn(() => null),
}));

import { formatWinTime, getHeatResultParts } from "./utils.js";
import EntityFactory from "../../backend/modules/lambdaDerby/src/shared/EntityFactory.js";

afterEach(() => vi.clearAllMocks());

// Times are microsecond [start, finish] pairs, as in the stored race
// standings. Phase one: car 42 (lane 1) beats car 7 by 2500 ms. Phase two runs
// in the opposite lanes.
const standing = (overrides = {}) =>
    new EntityFactory({}).build({
        PK: "org:RS",
        SK: "1",
        cn: ["42", "7"],
        Bp: "chart:3",
        ...overrides,
    });

describe("getHeatResultParts", () => {
    it("lists every phase the lane 1 car won", () => {
        const rs = standing({
            ph1: [1000000, 3500000],
            ph2: [2000000, 4600000],
        });

        expect(getHeatResultParts(rs, "42")).toEqual([
            `Overall: ${formatWinTime(rs.getWinTime(1, 0))}`,
            `A: ${formatWinTime(rs.getWinTime(1, 1))}`,
            `B: ${formatWinTime(rs.getWinTime(1, 2))}`,
        ]);
        expect(getHeatResultParts(rs, "7")).toEqual([]);
    });

    it("gives each car only the phases it won, like the race standing card", () => {
        // Car 42 wins phase A and overall; car 7 wins phase B.
        const rs = standing({
            ph1: [1000000, 3500000],
            ph2: [2000000, 1000000],
        });

        expect(getHeatResultParts(rs, "42")).toEqual([
            `Overall: ${formatWinTime(rs.getWinTime(1, 0))}`,
            `A: ${formatWinTime(rs.getWinTime(1, 1))}`,
        ]);
        expect(getHeatResultParts(rs, "7")).toEqual([
            `B: ${formatWinTime(rs.getWinTime(2, 2))}`,
        ]);
        // Same answers as RaceStanding.svelte's isWinner / getWinTime calls.
        for (const [lane, car] of [
            [1, "42"],
            [2, "7"],
        ]) {
            const expected = [
                [0, "Overall"],
                [1, "A"],
                [2, "B"],
            ]
                .filter(([phase]) => rs.isWinner(lane, phase))
                .map(
                    ([phase, label]) =>
                        `${label}: ${formatWinTime(rs.getWinTime(lane, phase))}`
                );
            expect(getHeatResultParts(rs, car)).toEqual(expected);
        }
    });

    it("shows only phase A before phase B has run", () => {
        const rs = standing({ ph1: [1000000, 3500000] });

        expect(getHeatResultParts(rs, "42")).toEqual([
            `A: ${formatWinTime(rs.getWinTime(1, 1))}`,
        ]);
        expect(getHeatResultParts(rs, "7")).toEqual([]);
    });

    it("shows the Called tag until there are results", () => {
        const rs = standing({ tg: [{ called: true }, {}] });

        expect(getHeatResultParts(rs, "42")).toEqual(["Called"]);
        expect(getHeatResultParts(rs, "7")).toEqual([]);

        rs.ph1 = [1000000, 3500000];
        expect(getHeatResultParts(rs, "42")[0]).not.toBe("Called");
    });

    it("returns nothing without a standing or a matching car", () => {
        const rs = standing({ ph1: [1000000, 3500000] });

        expect(getHeatResultParts(undefined, "42")).toEqual([]);
        expect(getHeatResultParts(rs, undefined)).toEqual([]);
        expect(getHeatResultParts(rs, null)).toEqual([]);
        expect(getHeatResultParts(rs, "99")).toEqual([]);
        // Car numbers may be stored as numbers.
        expect(
            getHeatResultParts(
                standing({ cn: [42, 7], ph1: [0, 1000000] }),
                "42"
            )
        ).toHaveLength(1);
    });
});
