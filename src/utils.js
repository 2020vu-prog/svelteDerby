export function safeGetAt(map, key) {
    if (map && key && map[key]) {
        return map[key].at;
    }
    else {
        return 0;
    }
}
export function buildDate(){
    return '[AIV]{date}[/AIV]'
}
export function buildVersion(){
    return '[AIV]{version}[/AIV]'
}