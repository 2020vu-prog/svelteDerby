import { writable, readable, get as getStore } from "svelte/store";
import { putUserPreference, getUserPreference } from "./eventDb.js";
export function persistable(key, defaultValue) {
    let currentValue = defaultValue;
    const { subscribe, set, update } = writable(defaultValue);
    try {
        const persisted = getUserPreference(key);

        if (persisted !== null) {
            currentValue = persisted;
            set(persisted);
        }
    } catch (error) {
        console.warn("DB error:", key, " Msg: ", error);
    }
    function persistentSet(value) {
        currentValue = value;
        set(value);
        try {
            putUserPreference(key, value);
        } catch (error) {
            console.warn(error);
        }
    }
    function persistentUpdate(fn) {
        persistentSet(fn(currentValue));
    }
    return {
        subscribe,
        set: persistentSet,
        update: persistentUpdate,
    };
}
