import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
    new URL("./regexEscape.js", import.meta.url),
    "utf8"
);
const moduleUnderTest = await import(
    `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);

const { escapeRegExp } = moduleUnderTest;

test("leaves plain text unchanged", () => {
    assert.equal(escapeRegExp("Smith"), "Smith");
    assert.equal(escapeRegExp("12"), "12");
    assert.equal(escapeRegExp(""), "");
});

test("escapes every regex metacharacter", () => {
    assert.equal(escapeRegExp("."), "\\.");
    assert.equal(escapeRegExp("*"), "\\*");
    assert.equal(escapeRegExp("+"), "\\+");
    assert.equal(escapeRegExp("?"), "\\?");
    assert.equal(escapeRegExp("^"), "\\^");
    assert.equal(escapeRegExp("$"), "\\$");
    assert.equal(escapeRegExp("{"), "\\{");
    assert.equal(escapeRegExp("}"), "\\}");
    assert.equal(escapeRegExp("("), "\\(");
    assert.equal(escapeRegExp(")"), "\\)");
    assert.equal(escapeRegExp("|"), "\\|");
    assert.equal(escapeRegExp("["), "\\[");
    assert.equal(escapeRegExp("]"), "\\]");
    assert.equal(escapeRegExp("\\"), "\\\\");
});

test("escapes multiple metacharacters in one string, in order", () => {
    assert.equal(escapeRegExp("a.b*c"), "a\\.b\\*c");
});

test("a trailing backslash -- the crash reported live -- no longer throws when used to build a RegExp", () => {
    const filter = "O'Brien\\";
    assert.doesNotThrow(() => new RegExp("^" + escapeRegExp(filter)));
});

test("escaped output still matches literally as a prefix", () => {
    const filter = "O'Brien (Jr.)";
    const re = new RegExp("^" + escapeRegExp(filter));
    assert.ok(re.test("O'Brien (Jr.) Smith"));
    assert.ok(!re.test("Something else"));
});
