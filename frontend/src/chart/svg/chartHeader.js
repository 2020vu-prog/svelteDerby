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
// The logo is centered horizontally within viewWidth, below the name band
// when the chart has a name.
export function chartHeaderLogo(imgPath = "", viewWidth = 0, chartName = "") {
    const logo = LOGOS[String(imgPath).split("/")[0].toUpperCase()];
    if (!logo) return undefined;
    const width = Math.round((logo.width / logo.height) * LOGO_HEIGHT);
    return {
        src: logo.src,
        alt: logo.alt,
        x: (viewWidth - width) / 2,
        y:
            (chartName ? NAME_HEADER_HEIGHT : 0) +
            (HEADER_HEIGHT - LOGO_HEIGHT) / 2,
        height: LOGO_HEIGHT,
        width,
    };
}

// Name band (when there is a name) above the logo band (when there is a logo).
export function chartHeaderHeight(logo, chartName) {
    return (logo ? HEADER_HEIGHT : 0) + (chartName ? NAME_HEADER_HEIGHT : 0);
}

// The chart name is centered on the page, above the logo, shrunk to fit.
export function chartHeaderTitle(chartName, viewWidth) {
    if (!chartName) return undefined;
    const availableWidth = Math.max(1, viewWidth - LOGO_PADDING * 2);
    const estimatedWidth = chartName.length * TITLE_FONT_SIZE * 0.62;
    return {
        text: chartName,
        x: viewWidth / 2,
        y: NAME_HEADER_HEIGHT / 2,
        fontSize:
            estimatedWidth > availableWidth
                ? (TITLE_FONT_SIZE * availableWidth) / estimatedWidth
                : TITLE_FONT_SIZE,
    };
}
