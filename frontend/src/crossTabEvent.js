// The selected event lives in localStorage, but each tab reads it only once at
// load. Another tab selecting a different event wipes the shared IndexedDB, and
// this tab would keep showing (and writing back) the old event's data. The
// browser fires "storage" in every *other* tab when localStorage changes, so
// App.svelte checks each storage event with this helper.
export const RACE_CONFIG_PREF_KEY = "pref:uiRaceConfig";

function selectedEventOf(config) {
    return `${(config && config.orgIz) || ""}/${(config && config.orgId) || ""}`;
}

// Mirrors putUserPreference() in eventDb.js, which stores {Value: value}.
function parseStoredConfig(raw) {
    if (!raw) return null;
    try {
        return JSON.parse(raw).Value;
    } catch (error) {
        return null;
    }
}

/**
 * Where to reload after another tab changed the event, when plain
 * `location.reload()` would be wrong. EventSelection auto-selects an event for
 * `/as/...` routes and the `as` query, so reloading on one would reselect this
 * tab's old event and undo the other tab's choice. Dropping the hash lands on
 * the default route instead.
 *
 * @param {string} href The current `window.location.href`.
 * @returns {string|null} The URL to load, or null to reload in place.
 */
export function neutralReloadUrl(href) {
    const url = new URL(href);
    const [path, query = ""] = url.hash.slice(1).split("?");
    const autoSelect =
        path.startsWith("/as/") || new URLSearchParams(query).get("as");
    return autoSelect ? url.origin + url.pathname + url.search : null;
}

/**
 * Whether a "storage" event means another tab selected a different event than
 * `currentConfig`. Updates to other fields of the same event and to other
 * preference keys do not count.
 *
 * @param {StorageEvent} event
 * @param {Object} currentConfig This tab's in-memory raceConfig.
 * @returns {boolean}
 */
export function selectedEventChangedElsewhere(event, currentConfig) {
    // key is null when another tab calls localStorage.clear().
    if (event.key !== null && event.key !== RACE_CONFIG_PREF_KEY) return false;
    const next = parseStoredConfig(event.newValue);
    return selectedEventOf(next) !== selectedEventOf(currentConfig);
}
