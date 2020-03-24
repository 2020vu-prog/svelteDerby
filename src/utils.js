export function safeGetAt(map, key) {
    if (map && key && map[key]) {
        return map[key].at;
    }
    else {
        return 0;
    }
}