import { expect, it } from "vitest";
import { PRINT_PAGE_CSS, buildPrintableSvg } from "./printSvg.js";
import {
    chartHeaderLayout,
    chartHeaderLogo,
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

it("stacks the event name, chart name and logo, all centered", () => {
    const header = chartHeaderLayout({
        eventName: "Spring Rally",
        chartName: "Junior Division",
        imgPath: "NDR/N08double.png",
        viewWidth: 1000,
    });

    expect(header.eventTitle.text).toBe("Spring Rally");
    expect(header.chartTitle.text).toBe("Junior Division");
    expect(header.eventTitle.x).toBe(500);
    expect(header.chartTitle.x).toBe(500);
    expect(header.logo.x + header.logo.width / 2).toBe(500);
    expect(header.eventTitle.y).toBeLessThan(header.chartTitle.y);
    expect(header.chartTitle.y + NAME_HEADER_HEIGHT / 2).toBeLessThanOrEqual(
        header.logo.y
    );
    expect(header.height).toBe(2 * NAME_HEADER_HEIGHT + HEADER_HEIGHT);
});

it("only reserves header bands that have content", () => {
    const layout = (options) =>
        chartHeaderLayout({ viewWidth: 1000, ...options });

    expect(layout({}).height).toBe(0);
    expect(layout({ imgPath: "x/y.png" }).logo).toBeUndefined();
    expect(layout({ eventName: "E" }).height).toBe(NAME_HEADER_HEIGHT);
    expect(layout({ chartName: "C" }).height).toBe(NAME_HEADER_HEIGHT);
    expect(layout({ imgPath: "NDR/n.png" }).height).toBe(HEADER_HEIGHT);
    // The chart name takes the top band when there is no event name.
    expect(layout({ chartName: "C" }).chartTitle.y).toBe(
        NAME_HEADER_HEIGHT / 2
    );
    expect(layout({ eventName: "E", chartName: "C" }).chartTitle.y).toBe(
        NAME_HEADER_HEIGHT * 1.5
    );
    // Without names the logo starts at the top of the header.
    expect(layout({ imgPath: "NDR/n.png" }).logo.y).toBeLessThan(
        NAME_HEADER_HEIGHT
    );
});

it("shrinks long header names to fit the page width", () => {
    const { eventTitle } = chartHeaderLayout({
        eventName: "A".repeat(80),
        viewWidth: 600,
    });

    expect(eventTitle.fontSize).toBeLessThan(28);
    expect(80 * eventTitle.fontSize * 0.62).toBeLessThanOrEqual(
        600 - 24 + 0.001
    );
});

it("prints with a zero page margin so the browser adds no header or footer", () => {
    expect(PRINT_PAGE_CSS).toMatch(/@page\s*{[^}]*margin:\s*0\s*;/);
    expect(PRINT_PAGE_CSS).toMatch(/body\s*{[^}]*padding:\s*0\.4in/);
});
