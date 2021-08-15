import { writable, readable, get as getStore } from "svelte/store";
import { putUserPreference, getUserPreference } from "./eventDb.js";
export function persistable(key, defaultValue) {
    let currentValue = defaultValue;
    const { subscribe, set, update } = writable(defaultValue);
    try {
        getUserPreference(key).then((persisted) => {
            if (persisted && persisted.Value !== undefined) {
                currentValue = persisted.Value;
                set(persisted.Value);
            }
        });
    } catch (error) {
        console.warn(error);
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
