import { readable } from "svelte/store";

// svelte-spa-router 5.x replaced its `location` and `querystring` stores with a
// `router` object backed by Svelte 5 reactive state. Components here are still
// Svelte 3 syntax, where `$:` blocks only re-run for component variables and
// store subscriptions, not for reads of reactive state on an imported object,
// so they keep reading the router through stores. Like the 4.x stores these are
// driven by the URL hash itself: `location` is the hash path (still
// percent-encoded) and `querystring` is what follows the `?`, without it.
//
// They read `window.location` on every `hashchange` instead of wrapping
// `router.location` (for example with `toStore`), because a store built on the
// router object keeps its last value between subscribers, so a component that
// mounts later can see a stale location.

/** The same split svelte-spa-router makes of the hash into path and query. */
export function readHash() {
    const href = typeof window !== "undefined" ? window.location.href : "";
    const hashPosition = href.indexOf("#/");
    let location = hashPosition > -1 ? href.substr(hashPosition + 1) : "/";
    let querystring = "";
    const queryPosition = location.indexOf("?");
    if (queryPosition > -1) {
        querystring = location.substr(queryPosition + 1);
        location = location.substr(0, queryPosition);
    }
    return { location, querystring };
}

function hashStore(pick) {
    return readable(pick(readHash()), (set) => {
        const update = () => set(pick(readHash()));
        update(); // the hash may have changed since the last subscriber left
        window.addEventListener("hashchange", update);
        return () => window.removeEventListener("hashchange", update);
    });
}

/** The current hash path, e.g. `/driverInfo/7`. */
export const location = hashStore((hash) => hash.location);

/** The current query string without the leading `?`. */
export const querystring = hashStore((hash) => hash.querystring);
