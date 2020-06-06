const {
    hasSvelteRoutePath,
} = require("../backend/modules/lambdaDerby/src/shared/PermissionLookup.js");
import { Auth } from "aws-amplify";
import { db } from "./eventDb.js";

export async function fmtChartPosition(RpRs) {
    if (RpRs.bracketPos && RpRs.bracketPos.includes(":")) {
        const [bmdKey, heat] = RpRs.bracketPos.split(":");
        console.log("getting bmd:", bmdKey);

        const bmd = await db.BracketMetaData.get(bmdKey);
        console.log("found bmd:", bmd);
        if (bmd) {
            return `${bmd.bracketName} -- Heat: ${heat}`;
        }
    }
    return "Heat: Adhoc";
}

export function getBracketLink(RpRs) {
    if (RpRs.bracketPos && RpRs.bracketPos.includes(":")) {
        const [bmdKey, heat] = RpRs.bracketPos.split(":");
        return "/ChartDetail/" + bmdKey;
    } else {
        return undefined; // No bracketLink for adhoc.
    }
}

export async function isUserAllowedRoutePath(routePath) {
    try {
        const user = await Auth.currentAuthenticatedUser();
        const attributes = await Auth.userAttributes(user);
        console.log("cognito attrs:", attributes);
        const email = attributes
            .filter((a) => {
                return a.Name === "email";
            })[0]
            .getValue();
        console.log("cognito email:", email);
        return email && hasSvelteRoutePath(email, routePath);
    } catch (err) {
        console.log("isUserAllowedRoutePath", err);
        return false;
    }
}
export function safeGetAt(map, key) {
    if (map && key && map[key]) {
        return map[key].at;
    } else {
        return 0;
    }
}
export function buildDate() {
    return "[AIV]{date}[/AIV]";
}
export function buildVersion() {
    return "[AIV]{version}[/AIV]";
}
export function parseHeatPos(cp) {
    const heatNumber = cp.replace(/[a-zA-Z]$/, "");
    const heatLetter = cp.replace(/^[0-9]*/, "");
    return [heatNumber, heatLetter];
}
export function hhmmssFmt(at) {
    // var time = new Date(racePhase.lastUpdate);
    var time = new Date(at);
    return (
        ("0" + time.getHours()).slice(-2) +
        ":" +
        ("0" + time.getMinutes()).slice(-2)
    );
}
