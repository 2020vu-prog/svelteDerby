import { render, screen, fireEvent, cleanup } from "@testing-library/svelte";
import { describe, it, expect, afterEach } from "vitest";
import Harness from "./TestHarness.svelte";

// The ui components replace sveltestrap 3 and must keep rendering the same
// Bootstrap 4 markup, so these pin its classes and behavior.
afterEach(cleanup);

describe("ui components render sveltestrap's Bootstrap 4 markup", () => {
    it("badge, button and card parts", () => {
        render(Harness);
        const badge = screen.getByText("badge");
        expect(badge.tagName).toBe("SPAN");
        expect(badge.className).toBe(
            "bigText badge badge-secondary badge-pill"
        );
        expect(badge.getAttribute("style")).toMatch(/^background: red;?$/);

        const go = screen.getByText("go");
        expect(go.tagName).toBe("BUTTON");
        expect(go.className).toBe("btn btn-primary btn-sm");
        expect(screen.getByText("off")).toBeDisabled();
        expect(screen.getByText("off").className).toBe("btn btn-secondary");

        const header = screen.getByText("header");
        expect(header.className).toBe("bg-info text-white card-header");
        expect(screen.getByText("title").className).toBe("card-title");
        expect(screen.getByText("footer").className).toBe(
            "bg-info card-footer"
        );
        const card = header.parentElement;
        expect(card.className).toBe("mt-3 border border-info card");
        expect(card.getAttribute("style")).toMatch(/^color: red;?$/);
        expect(screen.getByText("title").parentElement.className).toBe(
            "card-body"
        );
    });

    it("forwards click on the button and the card", async () => {
        const clicks = [];
        render(Harness, { clicks });
        await fireEvent.click(screen.getByText("go"));
        await fireEvent.click(screen.getByText("header"));
        expect(clicks).toEqual(["button", "card"]);
    });

    it("form group, label, form text and table", () => {
        render(Harness);
        expect(screen.getByText("help").tagName).toBe("SMALL");
        expect(screen.getByText("help").className).toBe("form-text text-muted");
        const checkLabel = screen.getByText("Gps").closest("label");
        expect(checkLabel.className).toBe("form-check-label");
        expect(checkLabel.getAttribute("for")).toBe("gps");
        expect(checkLabel.parentElement.className).toBe("form-check");
        expect(screen.getByText("Name").closest(".form-group")).not.toBeNull();
        const table = screen.getByText("cell").closest("table");
        expect(table.className).toBe(
            "table table-sm table-bordered table-striped"
        );
    });
});

describe("Input", () => {
    it("binds text, number, select and checkbox values both ways", async () => {
        const state = {};
        const { rerender, container } = render(Harness, { state });
        const text = screen.getByPlaceholderText("p");
        expect(text.className).toBe("form-control");
        expect(text.value).toBe("hello");
        await fireEvent.input(text, { target: { value: "typed" } });
        expect(state.text).toBe("typed");

        const number = container.querySelector('input[type="number"]');
        expect(number.className).toBe("form-control");
        expect(number.value).toBe("3");
        await fireEvent.input(number, { target: { value: "8" } });
        expect(state.seq).toBe(8);

        const select = container.querySelector("select");
        expect(select.className).toBe("form-control");
        expect(select.value).toBe("b");
        await fireEvent.change(select, { target: { value: "a" } });
        expect(state.flavor).toBe("a");

        const checkbox = container.querySelector('input[type="checkbox"]');
        expect(checkbox.className).toBe("big form-check-input");
        expect(checkbox.checked).toBe(false);
        await fireEvent.click(checkbox);
        expect(state.on).toBe(true);

        await rerender({ text: "from parent", on: false });
        expect(text.value).toBe("from parent");
        expect(checkbox.checked).toBe(false);
    });
});

describe("Collapse", () => {
    it("renders its content only while open", async () => {
        const { rerender } = render(Harness);
        expect(screen.queryByText("collapsed content")).toBeNull();
        await rerender({ collapseOpen: true });
        expect(screen.getByText("collapsed content")).toBeInTheDocument();
    });
});

describe("Modal", () => {
    it("renders nothing while closed and the Bootstrap 4 structure while open", async () => {
        const { rerender } = render(Harness);
        expect(screen.queryByText("Modal title")).toBeNull();
        expect(document.body.classList.contains("modal-open")).toBe(false);

        await rerender({ modalOpen: true });
        const title = screen.getByText("Modal title");
        expect(title.className).toBe("modal-title");
        expect(title.parentElement.className).toBe("modal-header");
        expect(screen.getByText("modal body").className).toBe("modal-body");
        expect(screen.getByText("modal footer").className).toBe("modal-footer");
        const modal = screen.getByRole("dialog");
        expect(modal.className).toBe("modal show d-block");
        expect(
            modal.querySelector(".modal-dialog > .modal-content")
        ).not.toBeNull();
        expect(document.querySelector(".modal-backdrop.show")).not.toBeNull();
        expect(document.body.classList.contains("modal-open")).toBe(true);
    });

    it("closes from the header close button, Escape, and a backdrop click", async () => {
        const state = {};
        const { rerender } = render(Harness, { modalOpen: true, state });
        await fireEvent.click(screen.getByLabelText("Close"));
        expect(state.toggles).toBe(1);

        await rerender({ modalOpen: true });
        await fireEvent.keyDown(document, { key: "Escape" });
        expect(state.toggles).toBe(2);

        await rerender({ modalOpen: true });
        const modal = screen.getByRole("dialog");
        await fireEvent.mouseDown(modal);
        await fireEvent.click(modal);
        expect(state.toggles).toBe(3);

        // a click inside the dialog, or one that began inside it, does not close
        await rerender({ modalOpen: true });
        const body = screen.getByText("modal body");
        await fireEvent.mouseDown(body);
        await fireEvent.click(body);
        await fireEvent.mouseDown(body);
        await fireEvent.click(screen.getByRole("dialog"));
        expect(state.toggles).toBe(3);
    });

    it("removes modal-open from the body when it closes", async () => {
        const state = {};
        const { rerender } = render(Harness, { modalOpen: true, state });
        expect(document.body.classList.contains("modal-open")).toBe(true);
        await rerender({ modalOpen: false });
        expect(document.body.classList.contains("modal-open")).toBe(false);
    });
});
