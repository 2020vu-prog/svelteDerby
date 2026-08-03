const {
    getShaCars,
    getSourceName,
} = require("../modules/lambdaDerby/src/utils.js");

describe("lambdaDerby utils", () => {
    test("getSourceName combines file basename and function name", () => {
        function exampleHandler() {
            return getSourceName();
        }

        expect(exampleHandler()).toBe("utils.test.js:exampleHandler");
    });

    test("getShaCars returns deterministic seeded car order", () => {
        const cars = [
            101,
            102,
            103,
            104,
            105,
            106,
            107,
            108,
            109,
            110,
            111,
            112,
            113,
            114,
            115,
            116,
        ];

        const firstOrder = getShaCars("2026-07-30T12:00:00.000Z", cars);
        const secondOrder = getShaCars("2026-07-30T12:00:00.000Z", cars);
        const otherSeedOrder = getShaCars("2026-07-30T12:01:00.000Z", cars);

        expect(firstOrder).toEqual(secondOrder);
        expect([...firstOrder].sort((a, b) => a - b)).toEqual(cars);
        expect(firstOrder).not.toEqual(cars);
        expect(firstOrder).not.toEqual(otherSeedOrder);
    });
});
