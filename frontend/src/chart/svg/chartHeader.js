export const HEADER_HEIGHT = 96;
const LOGO_HEIGHT = 80;
const LOGO_PADDING = 12;

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
