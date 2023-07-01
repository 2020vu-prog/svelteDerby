import log from "loglevel";
import { store as AuthStore } from "./stores/auth.js";
import axios from "axios";
import { Base64 } from "js-base64";
import { tutorial as Timer } from "@rr1.us/timer_protobuf";
const {
    hasSvelteRoutePath,
} = require("../../backend/modules/lambdaDerby/src/shared/PermissionLookup.js");
import { Auth } from "aws-amplify";
import { db } from "./eventDb.js";
import {
    userEmail as userEmailStore,
    userJwtStore,
    statusMessage,
    getAxios as getAxiosStore,
    raceConfig as raceConfigStore,
    roleMap as roleMapStore,
    getChartCacheKey,
    mqttMapSubscribe as mqttMapSubscribeStore,
} from "./stores.js";
import { logout as cognitoLogout } from "./stores/auth.js";
import { get } from "svelte/store";
import { localConfigDb } from "./eventDb.js";

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
    log.debug("isAllowedRoutePath effective org:", userEmail, orgIz);
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
    return isAllowedRoutePath(routePath);
}
// deprecated
export async function isUserAllowedRoutePath(routePath) {
    return isAllowedRoutePath(routePath);
    //return isEmailAllowedRoutePath(email, routePath);
}
export async function setJwt() {
    const session = get(AuthStore); // s/b lowercase!
    console.log("seeking jwt as :", session);
    if (
        session &&
        session.signInUserSession &&
        session.signInUserSession.idToken &&
        session.signInUserSession.idToken.jwtToken
    ) {
        const token = session.signInUserSession.idToken.jwtToken;
        console.log("Setting jwt as :", token);
        userJwtStore.set(token);
        await movedFromIot();
    }
    return;
    //if(session.signInUserSession.idToken.jwtToken)
}
async function requstPermissionHack(cognitoIdentityId) {
    if (!cognitoIdentityId) {
        log.debug("mfi.bypass rph. no id");
        return;
    }
    log.debug("mfi. doing rph: ", cognitoIdentityId);
    const raceConfig = get(raceConfigStore);
    const getAxios = get(getAxiosStore);
    const axios = await getAxios();
    axios
        .get(
            raceConfig.baseUrl +
                "/requestMqttSubPermission?orgId=" +
                raceConfig.orgId +
                "&orgIz=" +
                raceConfig.orgIz +
                "&principal=" +
                cognitoIdentityId
        )
        .then((response) => {
            log.debug("mfi. requstPermissionHack ok:" + response.data.length);
        })
        .catch((err) => {
            log.debug("mfi. requstPermissionHack failed:", err);
        });
}
async function movedFromIot() {
    const ccSession = await Auth.currentSession();
    log.debug("mfi.auth ccSession :", ccSession);
    const ccInfo = await Auth.currentCredentials();
    var cognitoIdentityId = "";
    if (ccInfo && ccInfo.data) {
        cognitoIdentityId = ccInfo.data.IdentityId;
        log.debug("mfi.auth ccInfo cognitoIdentityId:", cognitoIdentityId);
        await requstPermissionHack(cognitoIdentityId);
    } else {
        log.debug("mfi.auth ccInfo empty:", ccInfo);
    }
}

export function logout() {
    cognitoLogout();
    userJwtStore.set("");
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
    return ptcp && ptcp.toString().length >= 1;
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
    const userEmail = get(userEmailStore); // s/b lowercase!

    const getAxios = get(getAxiosStore);
    const axios = await getAxios();

    const req = {
        orgIz: orgIz,
        userEmail: userEmail,
    };
    axios
        .get(`${raceConfig.baseUrl}/getOrgRoles`, {
            params: req,
        })
        .then(async (response) => {
            log.debug("refreshOrgRoles: raw:", response.data);
            const roleMap = get(roleMapStore);
            log.debug("refreshOrgRoles: old:", roleMap);
            if (!roleMap[userEmail]) {
                roleMap[userEmail] = {};
            }
            log.debug("refreshOrgRoles: p1:", roleMap);
            if (response.data && response.data.roleList) {
                roleMap[userEmail][orgIz] = response.data.roleList;
                log.debug("refreshOrgRoles: now:", roleMap);
                roleMapStore.set(roleMap);
            }
        })
        .catch((err) => {
            log.debug(err);
        });
}

export async function getChartJson(jsonPath) {
    log.debug("utils getChartJson", jsonPath);

    const chartCacheKey = getChartCacheKey();
    try {
        const response = await axios.get(
            `/data/brackets/${jsonPath}?cacheKey=${chartCacheKey}`
        );
        return response.data;
    } catch (err) {
        log.debug("utils getChartJson failed: " + err);
    }
}
export async function getTimerPbConfig(timerName) {
    const tcFromDexie = await db.TimerPbConfig.get(timerName);
    if (tcFromDexie && tcFromDexie.pb) {
        log.debug("getTimerPbConfig: 0:", tcFromDexie.pb);
        log.debug("getTimerPbConfig: 0len:", tcFromDexie.pb.length);
        //const tcInit=atob(tcFromDexie.pb)
        const tcInit = Base64.toUint8Array(tcFromDexie.pb);
        log.debug("getTimerPbConfig: 1:", tcInit);

        const c = Timer.TimerConfig.decode(tcInit);
        log.debug("getTimerPbConfig: 2:", c);
        return [c, tcFromDexie];
    }
    return [];
}
export function fmtPinTime(timerPin) {
    if (!timerPin.stamp.gpsTime) {
        //log.debug("fmtPinTime baled", timerPin);
        const us = timerPin.stamp.tick64;
        //log.debug("fmtPinTime us", us);
        //log.debug("fmtPinTime us", typeof us);
        const ms = us / 1000;
        //log.debug("fmtPinTime from ", timerPin, " gave:", ms);
        let rpiDate = new Date(ms);
        return (
            "T: " +
            rpiDate.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                fractionalSecondDigits: 2, //this will round differently here than delta.  suppress resolution!
                timeZone: "UTC",
                //hour12: false,
                hourCycle: "h23",
            })
        );
        //return timerPin.stamp.tick64;
    }
    const m1 = 1000 * 1000;
    const ms =
        timerPin.stamp.gpsTime.seconds * 1000 +
        Math.round(timerPin.stamp.gpsTime.nanos / m1);
    //log.debug("fmtPinTime from ", timerPin, " gave:", ms);
    let gpsDate = new Date(ms);
    return gpsDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        fractionalSecondDigits: 3,
    });
}

import { onDestroy } from "svelte";

export function MqttMapSubscription(topic) {
    const tag = "syncMap:";
    const frequencyMs = 29000;
    const updateStoreFunc = function () {
        const mqttMapSubscribe = get(mqttMapSubscribeStore);
        mqttMapSubscribe[topic] = new Date().getTime() + frequencyMs + 5000;
        mqttMapSubscribeStore.set(mqttMapSubscribe);
        log.debug(
            `${new Date().toLocaleTimeString()} ${tag} MqttMapSubscription: set:`,
            topic
        );
    };
    updateStoreFunc(); // initial update

    // recurring update
    const interval = setInterval(updateStoreFunc, frequencyMs);

    // this s/b safe... https://svelte.dev/tutorial/ondestroy
    onDestroy(() => {
        clearInterval(interval);
        log.debug(
            `${new Date().toLocaleTimeString()} ${tag} MqttMapSubscription: destroy:`,
            topic
        );
    });
}
