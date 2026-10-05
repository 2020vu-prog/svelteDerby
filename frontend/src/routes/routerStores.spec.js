import { waitFor } from "@testing-library/svelte";
import { get } from "svelte/store";
import { describe, it, expect } from "vitest";
import { push, replace } from "svelte-spa-router";
import { location, querystring } from "#src/routes/routerStores.js";

// Contract tests for the parts of svelte-spa-router that 16 app files read
// directly (the `location` and `querystring` stores) plus push/replace.
// Under 2.2.0 `location` is the raw, still-encoded hash path and
// `querystring` has no leading "?". The router upgrade changes how these are
// exposed (stores become a router object in 5.x, and 3.x+ decodes params), so
// this pins today's behavior; a failure after an upgrade is the list of call
// sites to look at, not necessarily a bug.
//
// The stores are module-level singletons driven by hashchange, so each test
// navigates and waits for them to settle.
async function navigate(hash) {
    window.location.hash = hash;
    await waitFor(() => {
        expect(window.location.hash).toBe(hash);
    });
}

describe("svelte-spa-router stores", () => {
    it("location is the hash path", async () => {
        await navigate("#/driverInfo/7");

        await waitFor(() => expect(get(location)).toBe("/driverInfo/7"));
        expect(get(querystring)).toBe("");
    });

    it("querystring is the part after ? without the question mark", async () => {
        await navigate("#/chartDetail/abc?scrollTo=03A&view=svg");

        await waitFor(() => expect(get(location)).toBe("/chartDetail/abc"));
        expect(get(querystring)).toBe("scrollTo=03A&view=svg");
    });

    it("location keeps percent-encoding as typed", async () => {
        await navigate("#/eventSelection/IL%3ACHI2");

        await waitFor(() =>
            expect(get(location)).toBe("/eventSelection/IL%3ACHI2")
        );
    });

    it("an empty hash is the root route", async () => {
        await navigate("#/somewhere");
        await waitFor(() => expect(get(location)).toBe("/somewhere"));

        await navigate("");

        await waitFor(() => expect(get(location)).toBe("/"));
    });
});

describe("svelte-spa-router navigation", () => {
    it("push navigates and updates the stores, with its query string", async () => {
        await push("/driverList?x=1");

        await waitFor(() =>
            expect(window.location.hash).toBe("#/driverList?x=1")
        );
        await waitFor(() => expect(get(location)).toBe("/driverList"));
        expect(get(querystring)).toBe("x=1");
    });

    it("replace navigates without adding a history entry", async () => {
        await navigate("#/one");
        await push("/two");
        await waitFor(() => expect(get(location)).toBe("/two"));

        await replace("/three");
        await waitFor(() => expect(get(location)).toBe("/three"));

        // going back skips "/two" because it was replaced
        window.history.back();
        await waitFor(() => expect(get(location)).toBe("/one"));
    });
});

describe("stores read the current hash for every new subscriber", () => {
    it("a later subscriber sees the present location, not the last one an earlier subscriber saw", async () => {
        await navigate("#/first");
        const stop = location.subscribe(() => {});
        await waitFor(() => expect(get(location)).toBe("/first"));
        stop();

        await navigate("#/second");
        await navigate("");

        // back at the root, where the stores started: nothing may be remembered
        expect(get(location)).toBe("/");
        expect(get(querystring)).toBe("");
    });
});
