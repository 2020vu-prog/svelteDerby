const PRINT_PAGE_CSS = `
    @page { size: landscape; margin: 0.4in; }
    html, body { margin: 0; background: #fff; }
    svg { display: block; width: 100%; height: auto; max-height: 100vh; }
`;

function collectDocumentCss(doc) {
    const css = [];
    for (const sheet of Array.from(doc.styleSheets)) {
        try {
            css.push(
                Array.from(sheet.cssRules)
                    .map((rule) => rule.cssText)
                    .join("\n")
            );
        } catch (err) {
            // Cross-origin stylesheets are not readable; skip them.
        }
    }
    return css.join("\n");
}

// Copy of the live chart SVG for printing: no zoom sizing and none of the
// on-screen column show/hide buttons.
export function buildPrintableSvg(svg, baseUrl) {
    const clone = svg.cloneNode(true);
    clone.removeAttribute("style");
    clone.removeAttribute("width");
    clone.querySelectorAll(".column-control").forEach((el) => el.remove());
    clone.querySelectorAll("image").forEach((image) => {
        for (const attr of ["href", "xlink:href"]) {
            const value = image.getAttribute(attr);
            if (value) image.setAttribute(attr, new URL(value, baseUrl).href);
        }
    });
    return clone;
}

function waitForImages(svg, timeoutMs = 3000) {
    const pending = Array.from(svg.querySelectorAll("image")).map(
        (image) =>
            new Promise((resolve) => {
                const probe = new Image();
                probe.onload = probe.onerror = resolve;
                probe.src =
                    image.getAttribute("href") ||
                    image.getAttribute("xlink:href") ||
                    "";
            })
    );
    return Promise.race([
        Promise.all(pending),
        new Promise((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
}

export async function printSvgElement(svg, { title = "Chart" } = {}) {
    const doc = svg.ownerDocument;
    const printable = buildPrintableSvg(svg, doc.location.href);
    const frame = doc.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText =
        "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    doc.body.appendChild(frame);

    const frameDoc = frame.contentDocument;
    frameDoc.open();
    frameDoc.write("<!doctype html><html><head></head><body></body></html>");
    frameDoc.close();
    frameDoc.title = title;
    const style = frameDoc.createElement("style");
    style.textContent = `${collectDocumentCss(doc)}\n${PRINT_PAGE_CSS}`;
    frameDoc.head.appendChild(style);
    frameDoc.body.appendChild(frameDoc.importNode(printable, true));

    await waitForImages(printable);
    const cleanup = () => frame.remove();
    frame.contentWindow.addEventListener("afterprint", cleanup);
    frame.contentWindow.focus();
    frame.contentWindow.print();
    // afterprint is not fired everywhere; don't leak the frame.
    setTimeout(cleanup, 60000);
}
