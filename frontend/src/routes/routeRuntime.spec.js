import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, it, expect, vi } from "vitest";
import Router from "svelte-spa-router";
import { routerMap } from "#src/routes/routeRuntime.js";

// Every routed screen is replaced by a probe that prints the params it was
// given, so these tests exercise the real route adapter (routeRuntime's
// withDecodedParams + DecodedRoute) under the real router without booting
// any screen.
vi.mock("#src/routes/routeComponents.js", async () => {
    const probe = (await import("#src/routes/ParamProbe.spec-stub.svelte"))
        .default;
    return { routeComponents: new Proxy({}, { get: () => probe }) };
});

// svelte-spa-router 2.x hands components the raw, still-encoded path
// captures, and the app decodes them exactly once at this boundary
// (the "double decoding" trap in docs/TODO/SvelteUpgradeProposal.md). Router 3.x+
// decodes by itself, so when the router is upgraded and the app-side
// decoding is removed, these expectations should still hold unchanged; if the
// app-side decoding is left in, the double-encoded case below fails.
async function renderAt(hash, props = {}) {
    window.location.hash = hash;
    const view = render(Router, { routes: routerMap, ...props });
    const probe = await screen.findByTestId("probe");
    return { ...view, params: JSON.parse(probe.dataset.params) };
}

describe("route adapter", () => {
    it("decodes a percent-encoded path parameter", async () => {
        const { params } = await renderAt("#/eventSelection/IL%3ACHI2");

        expect(params).toEqual({ orgIz: "IL:CHI2" });
    });

    it("decodes exactly once, so a double-encoded value keeps one level", async () => {
        const { params } = await renderAt("#/eventSelection/IL%253ACHI2");

        expect(params).toEqual({ orgIz: "IL%3ACHI2" });
    });

    it("passes a malformed escape through unchanged", async () => {
        const { params } = await renderAt("#/eventSelection/bad%E0%A4%A");

        expect(params).toEqual({ orgIz: "bad%E0%A4%A" });
    });

    it("decodes each parameter of a multi-parameter route", async () => {
        const { params } = await renderAt(
            "#/driverDelegate/IL/IL%3Aabc/tok%2Fen%3D"
        );

        expect(params).toEqual({
            orgIz: "IL",
            orgId: "IL:abc",
            token: "tok/en=",
        });
    });

    it("an omitted optional parameter arrives as null", async () => {
        // router 2.x reports null here; screens only test it for truthiness,
        // so a later router giving undefined is fine, but it is worth knowing.
        const { params } = await renderAt("#/drivers");

        expect(params.selectable).toBeNull();
    });

    it("a route with no parameters gets an empty params object", async () => {
        const { params } = await renderAt("#/loginH");

        expect(params).toEqual({});
    });

    it("forwards a routeEvent raised by the screen to the router's listener", async () => {
        window.location.hash = "#/loginH";
        const { component } = render(Router, { routes: routerMap });
        const heard = vi.fn();
        component.$on("routeEvent", heard);

        await fireEvent.click(await screen.findByText("raise"));

        await waitFor(() => expect(heard).toHaveBeenCalledTimes(1));
        expect(heard.mock.calls[0][0].detail).toEqual({ from: "probe" });
    });
});
