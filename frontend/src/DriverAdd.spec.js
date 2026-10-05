import { render, fireEvent, waitFor, cleanup } from "@testing-library/svelte";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { readable, writable, get } from "svelte/store";

vi.mock("#src/stores.js", () => ({
    driverMap: writable({}),
    raceConfig: writable({}),
    axios: writable({ post: vi.fn() }),
    pushMessage: vi.fn(),
    theme: writable("blue"),
}));
vi.mock("#src/eventDb.js", () => ({ db: {} }));
vi.mock("svelte-spa-router", () => ({
    push: vi.fn(),
    pop: vi.fn(),
    replace: vi.fn(),
}));
vi.mock("#src/routes/frontendPermissions.js", async (importOriginal) => ({
    ...(await importOriginal()),
    createPermissionStore: () => readable(true),
}));

import DriverAdd from "#src/DriverAdd.svelte";
import { axios, raceConfig, pushMessage } from "#src/stores.js";

// The Driver CSV upload: the file is read as text, a leading BOM is stripped, the
// header row is mapped onto driver fields, and the rows are posted to /addBulk.
// It reads user-supplied files through csv-parse with `columns: true`, so this
// pins what the app gets from that parse across csv-parse upgrades.
const HEADER = "CarNumber,ShortName,Sponsor,Notes,MaintainerHashes";

async function uploadCsv(text) {
    const view = render(DriverAdd, { params: {} });
    await fireEvent.click(
        // the "Upload" button under the "Driver CSV" heading
        view.getAllByRole("button", { name: "Upload" })[0]
    );
    const input = view.container.querySelector("#driverJsonFileTag");
    const file = new File([text], "drivers.csv", { type: "text/csv" });
    await fireEvent.change(input, { target: { files: [file] } });
    return view;
}

const posted = () => get(axios).post.mock.calls[0];

beforeEach(() => {
    vi.clearAllMocks();
    raceConfig.set({ orgId: "event1", orgIz: "Test Org", baseUrl: "/api" });
    get(axios).post.mockResolvedValue({ data: {} });
});
afterEach(cleanup);

describe("driver CSV upload", () => {
    it("posts each row's fields to addBulk", async () => {
        await uploadCsv(
            `${HEADER}\n100,Alpha,ACME,,\n109,Bravo,Beta Co,fast,\n`
        );

        await waitFor(() => expect(get(axios).post).toHaveBeenCalledTimes(1));
        const [url, body] = posted();
        expect(url).toBe("/api/addBulk");
        expect(body).toMatchObject({ orgId: "event1", orgIz: "Test Org" });
        expect(body.bulk).toHaveLength(2);
        expect(body.bulk[0]).toMatchObject({
            number: "100",
            name: "Alpha",
            spon: "ACME",
        });
        expect(body.bulk[1]).toMatchObject({
            number: "109",
            name: "Bravo",
            spon: "Beta Co",
            notes: "fast",
        });
    });

    it("strips a leading BOM so the first column is still recognized", async () => {
        await uploadCsv(`﻿${HEADER}\n100,Alpha,ACME,,\n`);

        await waitFor(() => expect(get(axios).post).toHaveBeenCalledTimes(1));
        expect(posted()[1].bulk[0]).toMatchObject({ number: "100" });
    });

    it("keeps quoted commas, quotes and newlines, trims cells, and skips blank lines", async () => {
        await uploadCsv(
            `${HEADER}\n\n  7 ,"Smith, Jr.", "Say ""hi""" ,"two\nlines",\n\n`
        );

        await waitFor(() => expect(get(axios).post).toHaveBeenCalledTimes(1));
        const [row] = posted()[1].bulk;
        expect(row).toMatchObject({
            number: "7",
            name: "Smith, Jr.",
            spon: 'Say "hi"',
            notes: "two\nlines",
        });
    });

    it("splits a semicolon-joined maintainerHashes cell into a list", async () => {
        await uploadCsv(`${HEADER}\n1,A,,,"h1;h2;h3"\n2,B,,,\n`);

        await waitFor(() => expect(get(axios).post).toHaveBeenCalledTimes(1));
        const { bulk } = posted()[1];
        expect(bulk[0].maintainerHashes).toEqual(["h1", "h2", "h3"]);
        expect(bulk[1].maintainerHashes).toEqual([]);
    });

    it("drops rows without a name or number", async () => {
        await uploadCsv(`${HEADER}\n1,A,,,\n,NoNumber,,,\n3,,,,\n`);

        await waitFor(() => expect(get(axios).post).toHaveBeenCalledTimes(1));
        expect(posted()[1].bulk.map((d) => d.number)).toEqual(["1"]);
    });

    it("a __proto__ or constructor header never reaches the records' prototype", async () => {
        // csv-parse below 7.0.2 let a `columns` header replace an object's
        // prototype. The unknown columns are ignored by the field mapping.
        await uploadCsv(
            `__proto__,constructor,${HEADER}\nx,y,100,Alpha,ACME,,\n`
        );

        await waitFor(() => expect(get(axios).post).toHaveBeenCalledTimes(1));
        const [row] = posted()[1].bulk;
        expect(row).toMatchObject({ number: "100", name: "Alpha" });
        expect(Object.getPrototypeOf(row)).toBe(Object.prototype);
        expect({}.x).toBeUndefined();
    });

    it("reports when no row is valid instead of posting", async () => {
        await uploadCsv(`${HEADER}\n,,,,\n`);

        await waitFor(() =>
            expect(pushMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: "error",
                    text: expect.stringContaining("No valid driver rows"),
                })
            )
        );
        expect(get(axios).post).not.toHaveBeenCalled();
    });
});
