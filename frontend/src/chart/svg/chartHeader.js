// Header band heights: the logo band, and the chart name band below it.
export const HEADER_HEIGHT = 96;
export const NAME_HEADER_HEIGHT = 48;
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
// The logo is centered horizontally within viewWidth, `top` units down.
export function chartHeaderLogo(imgPath = "", viewWidth = 0, top = 0) {
    const logo = LOGOS[String(imgPath).split("/")[0].toUpperCase()];
    if (!logo) return undefined;
    const width = Math.round((logo.width / logo.height) * LOGO_HEIGHT);
    return {
        src: logo.src,
        alt: logo.alt,
        x: (viewWidth - width) / 2,
        y: top + (HEADER_HEIGHT - LOGO_HEIGHT) / 2,
        height: LOGO_HEIGHT,
        width,
    };
}

// Top to bottom: event name band, chart name band, logo band. Each is present
// only when it has content.
export function chartHeaderLayout({
    eventName = "",
    chartName = "",
    imgPath = "",
    viewWidth = 0,
} = {}) {
    const eventTop = 0;
    const chartTop = eventName ? NAME_HEADER_HEIGHT : 0;
    const logoTop = chartTop + (chartName ? NAME_HEADER_HEIGHT : 0);
    const logo = chartHeaderLogo(imgPath, viewWidth, logoTop);
    return {
        logo,
        eventTitle: chartHeaderTitle(eventName, viewWidth, eventTop),
        chartTitle: chartHeaderTitle(chartName, viewWidth, chartTop),
        height: logoTop + (logo ? HEADER_HEIGHT : 0),
    };
}

// A name centered on the page within its band (starting `top` units down),
// shrunk to fit.
export function chartHeaderTitle(text, viewWidth, top = 0) {
    if (!text) return undefined;
    const availableWidth = Math.max(1, viewWidth - LOGO_PADDING * 2);
    const estimatedWidth = text.length * TITLE_FONT_SIZE * 0.62;
    return {
        text,
        x: viewWidth / 2,
        y: top + NAME_HEADER_HEIGHT / 2,
        fontSize:
            estimatedWidth > availableWidth
                ? (TITLE_FONT_SIZE * availableWidth) / estimatedWidth
                : TITLE_FONT_SIZE,
    };
}
