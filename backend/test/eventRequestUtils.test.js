const {
    getEventKey,
    getOrgId,
    getOrgIz,
    getTtl,
    noopAsync,
    stringIsTrue,
} = require("../modules/lambdaDerby/src/eventRequestUtils.js");

// These helpers were extracted verbatim from derbyMain.js, so the tests pin
// their existing behavior, including the quirks, rather than an ideal one.

describe.each([
    ["getOrgId", getOrgId, "orgId"],
    ["getOrgIz", getOrgIz, "orgIz"],
])("%s", (_name, read, field) => {
    test("reads the JSON body first", () => {
        const event = {
            body: JSON.stringify({ [field]: "from-body" }),
            queryStringParameters: { [field]: "from-query" },
            [field]: "from-event",
        };

        expect(read(event)).toBe("from-body");
    });

    test("falls back to the query string, then the event itself", () => {
        expect(
            read({
                queryStringParameters: { [field]: "from-query" },
                [field]: "from-event",
            })
        ).toBe("from-query");
        expect(read({ [field]: "from-event" })).toBe("from-event");
    });

    test("returns null when the value is nowhere in the event", () => {
        expect(read({})).toBeNull();
        expect(read({ queryStringParameters: null })).toBeNull();
    });

    test("does not fall through once a body or query string is present", () => {
        // A body without the field, or a query string without it, wins over
        // the event's own field and yields undefined rather than null.
        expect(read({ body: "{}", [field]: "from-event" })).toBeUndefined();
        expect(
            read({ queryStringParameters: {}, [field]: "from-event" })
        ).toBeUndefined();
    });

    test("throws on a malformed JSON body", () => {
        expect(() => read({ body: "not json" })).toThrow(SyntaxError);
    });

    test("an empty body is treated as no body", () => {
        expect(read({ body: "", [field]: "from-event" })).toBe("from-event");
    });
});

describe("getEventKey", () => {
    test("joins the org zone and org id", () => {
        expect(
            getEventKey({ body: JSON.stringify({ orgIz: "Z", orgId: "I" }) })
        ).toBe("Z:I");
        expect(
            getEventKey({ queryStringParameters: { orgIz: "Z", orgId: "I" } })
        ).toBe("Z:I");
    });

    test("stringifies missing parts instead of failing", () => {
        expect(getEventKey({})).toBe("null:null");
        expect(getEventKey({ body: "{}" })).toBe("undefined:undefined");
        expect(getEventKey({ orgIz: "Z" })).toBe("Z:null");
    });
});

describe("getTtl", () => {
    test("resolves the config's TTL", async () => {
        await expect(getTtl({ TTL: 1234 })).resolves.toBe(1234);
        await expect(getTtl({ TTL: 0 })).resolves.toBe(0);
    });

    test("resolves null when there is no config, undefined when it has no TTL", async () => {
        await expect(getTtl(undefined)).resolves.toBeNull();
        await expect(getTtl(null)).resolves.toBeNull();
        await expect(getTtl({})).resolves.toBeUndefined();
    });
});

describe("stringIsTrue", () => {
    test("is true only for the word true, in any case", () => {
        expect(["true", "TRUE", "True", "tRuE"].map(stringIsTrue)).toEqual([
            true,
            true,
            true,
            true,
        ]);
    });

    test("is false for every other string, including padded ones", () => {
        expect(
            ["false", "", "yes", "1", " true", "true "].map(stringIsTrue)
        ).toEqual([false, false, false, false, false, false]);
    });

    test("throws for a missing value", () => {
        expect(() => stringIsTrue(undefined)).toThrow(TypeError);
        expect(() => stringIsTrue(null)).toThrow(TypeError);
    });
});

describe("noopAsync", () => {
    test("resolves a new empty list whatever it is passed", async () => {
        const first = await noopAsync({ any: "thing" });
        const second = await noopAsync();

        expect(first).toEqual([]);
        expect(second).toEqual([]);
        expect(first).not.toBe(second);
    });
});
