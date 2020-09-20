const {
    hasSvelteRoutePath,
} = require("../backend/modules/lambdaDerby/src/shared/PermissionLookup.js");
import { Auth } from "aws-amplify";
import { db } from "./eventDb.js";
import { userEmail } from "./stores.js";

const EntityFactory = require("../backend/modules/lambdaDerby/src/shared/EntityFactory.js");

export async function getHistoryEntity(PK, SK, at) {
    const key = { PK: PK, SK: SK, at: at };
    console.log("getHistoryEntity", key);
    const entityFromDb = await db.EventHistory.get(key);

    const entityFactory = new EntityFactory({});
    const rc = entityFactory.build(entityFromDb);
    console.log("getHistoryEntity gave:", rc);
    return rc;
}
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
        return "/ChartDetail/" + bmdKey + "?scrollTo=" + String(heat);
    } else {
        return undefined; // No bracketLink for adhoc.
    }
}

export function isEmailAllowedRoutePath(email, routePath) {
    return email && hasSvelteRoutePath(email, routePath);
}
export async function isUserAllowedRoutePath(routePath) {
    const email = await getUserEmail();
    return isEmailAllowedRoutePath(email, routePath);
}
export async function getUserEmail() {
    console.log("getUserEmail");
    try {
        const user = await Auth.currentAuthenticatedUser();
        console.log("getUserEmail cognito user:", user);
        const attributes = await Auth.userAttributes(user);
        console.log("getUserEmail cognito attrs:", attributes);
        const email = attributes
            .filter((a) => {
                return a.Name === "email";
            })[0]
            .getValue();
        console.log("getUserEmail email:", email);
        return email;
    } catch (err) {
        console.log("getUserEmail error:", err);
        userEmail.set(""); // update userEmail store
        return "";
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
        ("0" + time.getMinutes()).slice(-2) +
        ":" +
        ("0" + time.getSeconds()).slice(-2)
    );
}
export function participantFocusCompletion(ptcp) {
    return ptcp && ptcp.toString().length == 3;
}
export function participantValid(ptcp) {
    return ptcp && ptcp.toString().length >= 2;
}
