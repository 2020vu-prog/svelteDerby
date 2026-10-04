import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, it, expect, vi } from "vitest";
import Router from "svelte-spa-router";
import { routerMap } from "#src/routes/routeRuntime.js";

// Every routed screen is replaced by a probe that prints the params it was
// given, so these tests exercise routeRuntime's route map under the real
// router without booting any screen.
vi.mock("#src/routes/routeComponents.js", async () => {
    const probe = (await import("#src/routes/ParamProbe.spec-stub.svelte"))
        .default;
    return { routeComponents: new Proxy({}, { get: () => probe }) };
});

// svelte-spa-router 3.x and later decodes URL path parameters itself (2.x
// handed screens the raw captures and the app decoded them). These tests pin
// what a screen receives from the real router through routeRuntime's map, so a
// second decoding layer, which would corrupt any value that still contains a
// "%XX" sequence after the first decode, cannot be reintroduced unnoticed.
async function renderAt(hash, props = {}) {
    window.location.hash = hash;
    const view = render(Router, { routes: routerMap, ...props });
    const probe = await screen.findByTestId("probe");
    const shown = probe.dataset.params;
    return {
        ...view,
        params: shown === undefined ? undefined : JSON.parse(shown),
    };
}

describe("route params", () => {
    it("decodes a percent-encoded path parameter", async () => {
        const { params } = await renderAt("#/eventSelection/IL%3ACHI2");

        expect(params).toEqual({ orgIz: "IL:CHI2" });
    });

    it("is decoded exactly once, so a double-encoded value keeps one level", async () => {
        const { params } = await renderAt("#/eventSelection/IL%253ACHI2");

        expect(params).toEqual({ orgIz: "IL%3ACHI2" });
    });

    it("a malformed escape arrives as null", async () => {
        // router 2.x passed such a value through raw; 3.x+ reports null, which
        // screens treat as a missing parameter.
        const { params } = await renderAt("#/eventSelection/bad%E0%A4%A");

        expect(params).toEqual({ orgIz: null });
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

    it("a route with no parameters gets no params object", async () => {
        // router 2.x plus the old adapter gave {} here. Every screen that reads
        // route params declares `export let params = {}`, so undefined is safe.
        const { params } = await renderAt("#/loginH");

        expect(params).toBeUndefined();
    });

    it("the router forwards a routeEvent raised by a screen to its listener", async () => {
        window.location.hash = "#/loginH";
        const { component } = render(Router, { routes: routerMap });
        const heard = vi.fn();
        component.$on("routeEvent", heard);

        await fireEvent.click(await screen.findByText("raise"));

        await waitFor(() => expect(heard).toHaveBeenCalledTimes(1));
        expect(heard.mock.calls[0][0].detail).toEqual({ from: "probe" });
    });
});
