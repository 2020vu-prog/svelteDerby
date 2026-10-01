import { expect, it } from "vitest";
import { buildPrintableSvg } from "./printSvg.js";
import {
    chartHeaderHeight,
    chartHeaderLogo,
    chartHeaderTitle,
    HEADER_HEIGHT,
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
    expect(chartHeaderLogo("AASBD/Single/12single.png").src).toBe(
        "/chart-logo-aasbd.png"
    );
    expect(chartHeaderLogo("NDR/N08double.png").src).toBe(
        "/chart-logo-ndr.png"
    );
    expect(chartHeaderLogo("OTHER/x.png")).toBeUndefined();
    expect(chartHeaderLogo()).toBeUndefined();
    const logo = chartHeaderLogo("NDR/N08double.png");
    expect(logo.height).toBeLessThanOrEqual(HEADER_HEIGHT);
});

it("sizes the header and fits the chart name beside the logo", () => {
    const logo = chartHeaderLogo("NDR/N08double.png");
    expect(chartHeaderHeight(logo, "Name")).toBe(HEADER_HEIGHT);
    expect(chartHeaderHeight(undefined, "Name")).toBe(48);
    expect(chartHeaderHeight(undefined, "")).toBe(0);
    expect(chartHeaderTitle("", logo, 1000, HEADER_HEIGHT)).toBeUndefined();

    const title = chartHeaderTitle("Name", logo, 1000, HEADER_HEIGHT);
    expect(title.x).toBeGreaterThan(logo.x + logo.width);
    expect(title.y).toBe(HEADER_HEIGHT / 2);
    expect(title.fontSize).toBe(28);

    const long = chartHeaderTitle("A".repeat(80), logo, 600, HEADER_HEIGHT);
    expect(long.fontSize).toBeLessThan(28);
    expect(80 * long.fontSize * 0.62).toBeLessThanOrEqual(
        600 - long.x - 12 + 0.001
    );
});
