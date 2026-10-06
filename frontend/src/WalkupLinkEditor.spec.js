import { render, fireEvent, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import { writable } from "svelte/store";

vi.mock("#src/stores.js", () => ({
    theme: writable("blue"),
    spotifyApiReady: writable(false),
}));

import WalkupLinkEditor from "#src/WalkupLinkEditor.svelte";

afterEach(cleanup);

const TRACK = "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC";

describe("WalkupLinkEditor", () => {
    it("reports that an empty link is valid as soon as it is shown", () => {
        const onValidityChange = vi.fn();
        render(WalkupLinkEditor, { onValidityChange });

        expect(onValidityChange).toHaveBeenCalledWith({ valid: true });
    });

    it("reports a link that is not a Spotify track as invalid, then valid once it is", async () => {
        const onValidityChange = vi.fn();
        const view = render(WalkupLinkEditor, { onValidityChange });
        const input = view.getByPlaceholderText(/open\.spotify\.com\/track/);

        await fireEvent.input(input, { target: { value: "not a track" } });
        expect(onValidityChange).toHaveBeenLastCalledWith({ valid: false });
        expect(input).toHaveAttribute("aria-invalid", "true");

        await fireEvent.input(input, { target: { value: TRACK } });
        expect(onValidityChange).toHaveBeenLastCalledWith({ valid: true });
    });

    it("only calls back when the validity changes", async () => {
        const onValidityChange = vi.fn();
        const view = render(WalkupLinkEditor, { onValidityChange });
        const input = view.getByPlaceholderText(/open\.spotify\.com\/track/);
        const initial = onValidityChange.mock.calls.length;

        await fireEvent.input(input, { target: { value: "nope" } });
        await fireEvent.input(input, { target: { value: "still nope" } });

        expect(onValidityChange.mock.calls.length).toBe(initial + 1);
    });

    it("works without a listener", async () => {
        const view = render(WalkupLinkEditor);

        await fireEvent.input(
            view.getByPlaceholderText(/open\.spotify\.com\/track/),
            {
                target: { value: "nope" },
            }
        );

        expect(
            view.getByPlaceholderText(/open\.spotify\.com\/track/)
        ).toHaveValue("nope");
    });
});
