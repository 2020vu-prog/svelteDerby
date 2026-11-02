// The selected event lives in localStorage, but each tab reads it only once at
// load. Another tab selecting a different event wipes the shared IndexedDB, and
// this tab would keep showing (and writing back) the old event's data. The
// browser fires "storage" in every *other* tab when localStorage changes, so
// listen for the selected event changing there.
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
 * Calls `onChange(newConfig)` when another tab switches to a different event.
 * Updates to other raceConfig fields for the same event are ignored.
 *
 * @param {Object} options
 * @param {EventTarget} [options.target=window] Where "storage" events fire.
 * @param {Function} options.getCurrent Returns this tab's in-memory raceConfig.
 * @param {Function} options.onChange Called with the other tab's raceConfig.
 * @returns {Function} Stops listening.
 */
export function watchSelectedEventAcrossTabs({
    target = window,
    getCurrent,
    onChange,
}) {
    const handler = (event) => {
        // key is null when another tab calls localStorage.clear().
        if (event.key !== null && event.key !== RACE_CONFIG_PREF_KEY) return;
        const next = parseStoredConfig(event.newValue);
        if (selectedEventOf(next) === selectedEventOf(getCurrent())) return;
        onChange(next);
    };
    target.addEventListener("storage", handler);
    return () => target.removeEventListener("storage", handler);
}
