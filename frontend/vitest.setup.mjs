// jsdom has no IndexedDB implementation, but src/eventDb.js constructs Dexie
// instances at module load time (`new Dexie("eventDb")`), and many components
// pull that in transitively via stores.js/storedb.js. Polyfill it globally so
// importing those modules under test behaves the way it does in a real browser.
import "fake-indexeddb/auto";

import "@testing-library/jest-dom/vitest";

// jsdom has no Web Animations API, which Svelte 5 transitions (fade, slide, ...)
// run on: `element.animate()` is how it times an intro or outro and learns when it
// is done. This stand-in runs the animation for its real duration and then fires
// `onfinish`, which is all the components under test depend on.
if (!Element.prototype.animate) {
    Element.prototype.animate = function animate(_keyframes, options) {
        const duration =
            typeof options === "number" ? options : (options?.duration ?? 0);
        const animation = {
            currentTime: 0,
            playState: "running",
            effect: {},
            onfinish: null,
            cancel() {
                clearTimeout(timer);
                this.playState = "idle";
            },
        };
        const timer = setTimeout(() => {
            animation.currentTime = duration;
            animation.playState = "finished";
            animation.onfinish?.();
        }, duration);
        return animation;
    };
}
