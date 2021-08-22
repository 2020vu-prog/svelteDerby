import log from "loglevel";

const {
    hasSvelteRoutePath,
} = require("../../backend/modules/lambdaDerby/src/shared/PermissionLookup.js");
import { Auth } from "aws-amplify";
import { db } from "./eventDb.js";
import {
    userEmail as userEmailStore,
    statusMessage,
    raceConfig as raceConfigStore,
    roleMap as roleMapStore,
} from "./stores.js";
import { logout } from "./stores/auth.js";
import { get } from "svelte/store";
import { localConfigDb } from "./eventDb.js";

const axios = require("axios");

const EntityFactory = require("../../backend/modules/lambdaDerby/src/shared/EntityFactory.js");

export async function getHistoryEntity(PK, SK, at) {
    const key = { PK: PK, SK: SK, at: at };
    log.debug("getHistoryEntity", key);
    const entityFromDb = await db.EventHistory.get(key);

    const entityFactory = new EntityFactory({});
    const rc = entityFactory.build(entityFromDb);
    log.debug("getHistoryEntity gave:", rc);
    return rc;
}
export async function fmtChartPosition(RpRs) {
    if (RpRs.bracketPos && RpRs.bracketPos.includes(":")) {
        const [bmdKey, heat] = RpRs.bracketPos.split(":");
        log.debug("getting bmd:", bmdKey);

        const bmd = await db.BracketMetaData.get(bmdKey);
        log.debug("found bmd:", bmd);
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
export function isAllowedRoutePath(routePath, orgIz = null) {
    const roleMap = get(roleMapStore);
    const userEmail = get(userEmailStore);
    // orgIz usually can default to active RaceConfig.
    //   eventSelection may try to add an event for a different org.
    //   (it will pass in an override for orgIz)
    if (!orgIz) {
        const raceConfig = get(raceConfigStore);
        orgIz = raceConfig.orgIz;
    }
    log.debug("isAllowedRoutePath effective org:", orgIz);
    if (userEmail && orgIz && roleMap[userEmail] && roleMap[userEmail][orgIz]) {
        const roleList = roleMap[userEmail][orgIz];
        return roleMap && hasSvelteRoutePath(null, roleList, routePath);
    } else {
        return false;
    }
}
// deprecated
export function isEmailAllowedRoutePath(email, routePath) {
    //const raceConfig = get(raceConfigStore);
    return email && isAllowedRoutePath(routePath);
}
// deprecated
export async function isUserAllowedRoutePath(routePath) {
    const email = await getUserEmail();
    return email && isAllowedRoutePath(routePath);
    //return isEmailAllowedRoutePath(email, routePath);
}
export async function getUserEmail() {
    log.debug("getUserEmail");
    try {
        const user = await Auth.currentAuthenticatedUser();
        log.debug("getUserEmail cognito user:", user);
        const attributes = await Auth.userAttributes(user);
        log.debug("getUserEmail cognito attrs:", attributes);
        const email = attributes
            .filter((a) => {
                return a.Name === "email";
            })[0]
            .getValue();
        log.debug("getUserEmail email:", email);
        return email;
    } catch (err) {
        log.debug("getUserEmail error:", err);
        userEmailStore.set(""); // update userEmail store
        logout(); // cognito thinks we aren't logged in.  sync the store
        /*statusMessage.set({
            text: `Please login to use this system.`,
            type: "error",
        });*/
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
function getHeight(box) {
    let height = box.offsetHeight;
    let style = getComputedStyle(box);

    let marginTop = parseInt(style.marginTop);
    let marginBottom = parseInt(style.marginBottom);
    return height + marginBottom + marginTop;
}
export function getMainFull(qsList = []) {
    qsList.push("#topnav");
    qsList.push("#bottomNavBar");
    let winHeight =
        window.innerHeight ||
        document.documentElement.clientHeight ||
        document.body.clientHeight;
    log.debug(`getMainFull window ${winHeight}`);

    var accum = 0;
    qsList.forEach((qs) => {
        const el = document.querySelector(qs);
        log.debug(`getMainFull qs: ${qs} el: ${el}`);
        var elHeight = getHeight(el);
        log.debug(`getMainFull qs: ${qs} elHeight: ${elHeight}`);
        accum += elHeight;
    });
    const rc = winHeight - accum;
    log.debug(`getMainFull accum: ${accum} rc: ${rc}`);
    return rc;
}
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function refreshOrgRoles(orgIz) {
    log.debug("refreshOrgRoles:");
    const raceConfig = get(raceConfigStore);
    const currentSession = await Auth.currentSession();
    const bearer = currentSession.idToken.jwtToken;
    const userEmail = get(userEmailStore);

    axios.defaults.headers.common["Authorization"] = bearer;
    axios
        .get(
            raceConfig.baseUrl +
                `/getOrgRoles?orgIz=${orgIz}&userEmail=${userEmail}`
        )
        .then(async (response) => {
            log.debug("refreshOrgRoles: raw:", response.data);
            const roleMap = get(roleMapStore);
            log.debug("refreshOrgRoles: old:", roleMap);
            if (!roleMap[userEmail]) {
                roleMap[userEmail] = {};
            }
            log.debug("refreshOrgRoles: p1:", roleMap);
            roleMap[userEmail][orgIz] = response.data;
            log.debug("refreshOrgRoles: now:", roleMap);
            roleMapStore.set(roleMap);
        })
        .catch((err) => {
            log.debug(err);
        });
}
