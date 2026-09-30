import { afterEach, describe, expect, it, vi } from "vitest";

const { bmdGet, bmdJsonGet } = vi.hoisted(() => ({
    bmdGet: vi.fn(),
    bmdJsonGet: vi.fn(),
}));
vi.mock("./eventDb.js", () => ({
    db: {
        BracketMetaData: { get: bmdGet },
        BmdJson: { get: bmdJsonGet, put: vi.fn(), delete: vi.fn() },
    },
    localConfigDb: {},
    putUserPreference: vi.fn(),
    getUserPreference: vi.fn(() => null),
}));

import { fmtChartPosition, getChartJson } from "./utils.js";

const bmd = { SK: "bmd-1", bracketName: "Bracket A", jsonPath: "a.json" };
const chartJson = {
    imgPositions: {},
    progress: {
        "01": { HeatNumber: "01", Annotation: "" },
        14: { HeatNumber: "14", Annotation: "Championship" },
        15: { HeatNumber: "15", Annotation: "Championship2" },
        16: { HeatNumber: "16" },
    },
};

afterEach(() => vi.clearAllMocks());

describe("fmtChartPosition annotation", () => {
    it("appends the heat annotation in parentheses", async () => {
        bmdGet.mockResolvedValue(bmd);
        bmdJsonGet.mockResolvedValue(chartJson);

        const [label] = await fmtChartPosition({ bracketPos: "bmd-1:15" });

        expect(label).toBe("Bracket A -- Heat: 15 (Championship2)");
    });

    it("leaves the label alone when the heat has no annotation", async () => {
        bmdGet.mockResolvedValue(bmd);
        bmdJsonGet.mockResolvedValue(chartJson);

        for (const heat of ["01", "16", "99"]) {
            const [label] = await fmtChartPosition({
                bracketPos: `bmd-1:${heat}`,
            });
            expect(label).toBe(`Bracket A -- Heat: ${heat}`);
        }
    });

    it("falls back to the plain label when chart JSON is unavailable", async () => {
        bmdGet.mockResolvedValue(bmd);
        bmdJsonGet.mockRejectedValue(new Error("no db"));

        const [label] = await fmtChartPosition({ bracketPos: "bmd-1:14" });

        expect(label).toBe("Bracket A -- Heat: 14");
    });

    it("shares one chart JSON load across concurrent calls", async () => {
        bmdGet.mockResolvedValue(bmd);
        bmdJsonGet.mockResolvedValue(chartJson);

        const labels = await Promise.all(
            ["01", "14", "15"].map((heat) =>
                fmtChartPosition({ bracketPos: `bmd-1:${heat}` })
            )
        );

        expect(labels.map(([label]) => label)).toEqual([
            "Bracket A -- Heat: 01",
            "Bracket A -- Heat: 14 (Championship)",
            "Bracket A -- Heat: 15 (Championship2)",
        ]);
        expect(bmdJsonGet).toHaveBeenCalledTimes(1);
    });

    it("does not reuse a finished load", async () => {
        bmdJsonGet.mockResolvedValue(chartJson);

        await getChartJson(bmd);
        await getChartJson(bmd);

        expect(bmdJsonGet).toHaveBeenCalledTimes(2);
    });
});
