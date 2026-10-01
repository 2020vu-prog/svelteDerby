import { expect, it } from "vitest";
import { buildPrintableSvg } from "./printSvg.js";
import {
    chartHeaderHeight,
    chartHeaderLogo,
    chartHeaderTitle,
    HEADER_HEIGHT,
    NAME_HEADER_HEIGHT,
} from "./chartHeader.js";

it("builds a printable SVG without zoom sizing or column buttons", () => {
    document.body.innerHTML = `
        <svg style="width: 500px" width="500" viewBox="0 0 10 10">
            <g class="column-control"><rect /></g>
            <line class="hidden-column-placeholder" />
            <image href="/chart-logo-ndr.png" />
        </svg>`;

    const printable = buildPrintableSvg(
        document.querySelector("svg"),
        "https://example.test/#/chart"
    );

    expect(printable.hasAttribute("style")).toBe(false);
    expect(printable.hasAttribute("width")).toBe(false);
    expect(printable.getAttribute("viewBox")).toBe("0 0 10 10");
    expect(printable.querySelector(".column-control")).toBeNull();
    expect(
        printable.querySelector(".hidden-column-placeholder")
    ).not.toBeNull();
    expect(printable.querySelector("image").getAttribute("href")).toBe(
        "https://example.test/chart-logo-ndr.png"
    );
    // The on-screen SVG is left untouched.
    expect(document.querySelector(".column-control")).not.toBeNull();
});

it("picks the header logo from the chart image path", () => {
    expect(chartHeaderLogo("AASBD/Single/12single.png", 100).src).toBe(
        "/chart-logo-aasbd.png"
    );
    expect(chartHeaderLogo("NDR/N08double.png", 100).src).toBe(
        "/chart-logo-ndr.png"
    );
    expect(chartHeaderLogo("OTHER/x.png")).toBeUndefined();
    expect(chartHeaderLogo()).toBeUndefined();
    const logo = chartHeaderLogo("NDR/N08double.png", 100);
    expect(logo.height).toBeLessThanOrEqual(HEADER_HEIGHT);
});

it("sizes the header bands and centers the chart name above the logo", () => {
    const logo = chartHeaderLogo("NDR/N08double.png", 1000, "Name");
    expect(chartHeaderLogo("OTHER/x.png", 1000)).toBeUndefined();
    expect(logo.x + logo.width / 2).toBe(500);

    expect(chartHeaderHeight(logo, "")).toBe(HEADER_HEIGHT);
    expect(chartHeaderHeight(undefined, "Name")).toBe(NAME_HEADER_HEIGHT);
    expect(chartHeaderHeight(logo, "Name")).toBe(
        HEADER_HEIGHT + NAME_HEADER_HEIGHT
    );
    expect(chartHeaderHeight(undefined, "")).toBe(0);
    expect(chartHeaderTitle("", 1000)).toBeUndefined();

    const title = chartHeaderTitle("Name", 1000);
    expect(title.x).toBe(500);
    expect(title.y).toBe(NAME_HEADER_HEIGHT / 2);
    expect(title.y).toBeLessThan(logo.y);
    expect(title.fontSize).toBe(28);
    // Without a name the logo starts at the top of the header.
    expect(chartHeaderLogo("NDR/N08double.png", 1000).y).toBeLessThan(
        NAME_HEADER_HEIGHT
    );

    const long = chartHeaderTitle("A".repeat(80), 600);
    expect(long.fontSize).toBeLessThan(28);
    expect(80 * long.fontSize * 0.62).toBeLessThanOrEqual(600 - 24 + 0.001);
});
