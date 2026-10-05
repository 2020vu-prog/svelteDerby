import { render, fireEvent, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import { readable, writable } from "svelte/store";

vi.mock("#src/stores.js", () => ({
    chartClickLoggerId: writable(""),
    chartClickLoggerShow: writable(true),
    theme: writable("blue"),
}));
vi.mock("#src/routes/frontendPermissions.js", async (importOriginal) => ({
    ...(await importOriginal()),
    createPermissionStore: () => readable(true),
}));

import ChartClickLogger from "#src/ChartClickLogger.svelte";

afterEach(cleanup);

describe("ChartClickLogger", () => {
    it("calls onCopyJson when Copy Json is pressed", async () => {
        const onCopyJson = vi.fn();
        const view = render(ChartClickLogger, { onCopyJson });

        await fireEvent.click(view.getByRole("button", { name: "Copy Json" }));

        expect(onCopyJson).toHaveBeenCalledTimes(1);
    });

    it("does nothing when no listener is given", async () => {
        const view = render(ChartClickLogger);

        await fireEvent.click(view.getByRole("button", { name: "Copy Json" }));

        expect(
            view.getByRole("button", { name: "Copy Json" })
        ).toBeInTheDocument();
    });
});
