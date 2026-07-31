const { getSourceName } = require("../modules/lambdaDerby/src/utils.js");

describe("lambdaDerby utils", () => {
    test("getSourceName combines file basename and function name", () => {
        function exampleHandler() {
            return getSourceName();
        }

        expect(exampleHandler()).toBe("utils.test.js:exampleHandler");
    });
});
