export const HEADER_HEIGHT = 96;
export const NAME_ONLY_HEADER_HEIGHT = 48;
const LOGO_HEIGHT = 80;
const LOGO_PADDING = 12;
const TITLE_FONT_SIZE = 28;

const LOGOS = {
    AASBD: {
        src: "/chart-logo-aasbd.png",
        alt: "All-American Soap Box Derby",
        width: 175,
        height: 185,
    },
    NDR: {
        src: "/chart-logo-ndr.png",
        alt: "National Derby Rallies",
        width: 400,
        height: 158,
    },
};

// Chart image paths are "<ORG>/...", e.g. "AASBD/Double/08double.png".
export function chartHeaderLogo(imgPath = "") {
    const logo = LOGOS[String(imgPath).split("/")[0].toUpperCase()];
    if (!logo) return undefined;
    return {
        src: logo.src,
        alt: logo.alt,
        x: LOGO_PADDING,
        y: (HEADER_HEIGHT - LOGO_HEIGHT) / 2,
        height: LOGO_HEIGHT,
        width: Math.round((logo.width / logo.height) * LOGO_HEIGHT),
    };
}

export function chartHeaderHeight(logo, chartName) {
    if (logo) return HEADER_HEIGHT;
    return chartName ? NAME_ONLY_HEADER_HEIGHT : 0;
}

// The chart name sits beside the logo (or at the left edge without one),
// shrunk to fit the chart width.
export function chartHeaderTitle(chartName, logo, viewWidth, headerHeight) {
    if (!chartName) return undefined;
    const x = logo ? logo.x + logo.width + 16 : LOGO_PADDING;
    const availableWidth = Math.max(1, viewWidth - x - LOGO_PADDING);
    const estimatedWidth = chartName.length * TITLE_FONT_SIZE * 0.62;
    return {
        text: chartName,
        x,
        y: headerHeight / 2,
        fontSize:
            estimatedWidth > availableWidth
                ? (TITLE_FONT_SIZE * availableWidth) / estimatedWidth
                : TITLE_FONT_SIZE,
    };
}
