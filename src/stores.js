import { writable } from 'svelte/store';

export const standings = writable([]);
export const driverMap = writable({});
export const carFilter = writable("");
export const nextOnBlocks = writable({});
export const raceConfig= writable({
    orgName: "Chicago"
});