import log from "loglevel";
import axios from "axios";
import { Base64 } from "js-base64";
import { tutorial as Timer } from "@rr1.us/timer_protobuf";
const {
    hasSvelteRoutePath,
} = require("../../backend/modules/lambdaDerby/src/shared/PermissionLookup.js");
import { db } from "./eventDb.js";
import {
    userEmail as userEmailStore,
    userJwtStore,
    pushMessage,
    getAxios as getAxiosStore,
    raceConfig as raceConfigStore,
    roleMap as roleMapStore,
    driverMap as driverMapStore,
    getChartCacheKey,
    mqttMapSubscribe as mqttMapSubscribeStore,
    nowDate,
    timeFormat,
} from "./stores.js";
import { get } from "svelte/store";
import { localConfigDb } from "./eventDb.js";
import { location as spaLocation } from "svelte-spa-router";

const EntityFactory = require("../../backend/modules/lambdaDerby/src/shared/EntityFactory.js");

export function getSpaLocation() {
    return get(spaLocation);
}

export function protobufLongToNumber(value) {
    if (value == null || typeof value === "number") {
        return value;
    }
    if (typeof value.toNumber === "function") {
        return value.toNumber();
    }
    return Number(value);
}

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
    const pendingNeeded = isPendingNeeded(RpRs);
    if (RpRs.bracketPos && RpRs.bracketPos.includes(":")) {
        const [bmdKey, heat] = RpRs.bracketPos.split(":");
        log.debug("getting bmd:", bmdKey);

        const bmd = await db.BracketMetaData.get(bmdKey);
        log.debug("found bmd:", bmd);
        if (bmd) {
            return [`${bmd.bracketName} -- Heat: ${heat}`, pendingNeeded];
        }
    }
    if (RpRs.pt && RpRs.pt.startsWith("H")) {
        return ["Hot Run", pendingNeeded];
    }
    if (RpRs.pt && RpRs.pt.startsWith("T")) {
        return ["Trial Run", pendingNeeded];
    }
    if (RpRs.pt && RpRs.pt.startsWith("F")) {
        return ["Fun Run", pendingNeeded];
    }
    if (RpRs.pt && RpRs.pt.startsWith("Y")) {
        return ["Bye Run", pendingNeeded];
    }
    return ["Heat: Adhoc", pendingNeeded];
}
export function getRaceTypeEmoji(i) {
    const trialRunEmoji = "⚗️";
    const hotRunEmoji = "🔥";
    const funRunEmoji = "😊";
    const byeRunEmoji = "👋";
    if (i === "H") {
        return hotRunEmoji;
    }
    if (i === "F") {
        return funRunEmoji;
    }
    if (i === "T") {
        return trialRunEmoji;
    }
    if (i === "Y") {
        return byeRunEmoji;
    }
    return "";
}
export function isPendingNeededForType(pt) {
    //log.debug(`isPendingNeededForType ${pt}`)
    if (!pt) {
        return true;
    }
    if (pt.startsWith("H")) {
        return false;
    } //hot run
    if (pt.startsWith("T")) {
        return false;
    } //trial run
    if (pt.startsWith("F")) {
        return false;
    } //fun run
    if (pt.startsWith("Y")) {
        return false;
    } //bye run

    //return false
    return true;
}
export function isPendingNeeded(RpRs) {
    if (RpRs.pt) {
        return isPendingNeededForType(RpRs.pt);
    }

    return true;
}

export function getBracketLink(RpRs) {
    if (RpRs.bracketPos && RpRs.bracketPos.includes(":")) {
        const [bmdKey, heat] = RpRs.bracketPos.split(":");
        return "/ChartDetail/" + bmdKey + "?scrollTo=" + String(heat);
    } else {
        return undefined; // No bracketLink for adhoc.
    }
}
function getRoleListByOrgUser(userEmail, orgIz) {
    const roleMap = get(roleMapStore);
    //log.debug("isAllowedRoutePath map:", userEmail,orgIz);
    //log.debug("isAllowedRoutePath map:", roleMap);
    if (userEmail && orgIz && roleMap[userEmail] && roleMap[userEmail][orgIz]) {
        return roleMap[userEmail][orgIz];
    } else {
        return []; //no roles
    }
}
export function isAllowedRoutePath(routePath, orgIz = null) {
    const userEmail = get(userEmailStore);
    // orgIz usually can default to active RaceConfig.
    //   eventSelection may try to add an event for a different org.
    //   (it will pass in an override for orgIz)
    if (!orgIz) {
        const raceConfig = get(raceConfigStore);
        orgIz = raceConfig.orgIz;
    }
    log.debug("isAllowedRoutePath effective org:", userEmail, orgIz);
    const roleList = getRoleListByOrgUser(userEmail, orgIz);
    log.debug("isAllowedRoutePath roles:", roleList);
    return hasSvelteRoutePath(null, roleList, routePath);
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

export function logout() {
    //cognitoLogout();
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
export function mmddyyFmt(at) {
    var time = new Date(at);
    const month1 = time.getMonth() + 1;
    return (
        ("0" + month1).slice(-2) +
        "/" +
        ("0" + time.getDate()).slice(-2) +
        "/" +
        ("0" + time.getFullYear()).slice(-2)
    );
}
export function dateChangeLabel(date, priorDate) {
    if (!date) {
        return "";
    }
    const label = new Date(date).toLocaleDateString();
    if (label === new Date().toLocaleDateString()) {
        return "";
    }
    if (priorDate && new Date(priorDate).toLocaleDateString() === label) {
        return "";
    }
    return label;
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
    try {
        const response = await axios.get(`${raceConfig.baseUrl}/getOrgRoles`, {
            params: req,
        });
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
    } catch (err) {
        log.debug(err);
    }
}

export async function getChartJson(bmdFromDexie) {
    const bmdJson = await db.BmdJson.get(bmdFromDexie.SK);
    log.debug("utils getChartJson cache:", bmdJson);
    if (bmdJson) {
        return bmdJson;
    }
    const cacheItem = await getChartJsonAxios(bmdFromDexie);
    const bmdJsonCache = {
        SK: bmdFromDexie.SK,
        ...cacheItem,
    };
    log.debug("utils getChartJson gave", bmdFromDexie);
    try {
        await db.BmdJson.put(bmdJsonCache);
        log.debug("utils getChartJson cache saved:", bmdFromDexie);
    } catch (err) {
        log.debug("utils getChartJson cache write failed: " + err);
    }
    return cacheItem;
}
async function getChartJsonAxios(bmdFromDexie) {
    log.debug("utils getChartJsonAxios begin", bmdFromDexie);
    const jsonPath = bmdFromDexie.jsonPath;
    const chartCacheKey = getChartCacheKey();
    try {
        const response = await axios.get(
            `/data/brackets/${jsonPath}?cacheKey=${chartCacheKey}`
        );
        return response.data;
    } catch (err) {
        log.debug("utils getChartJsonAxios failed: " + err);
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
export function getTimerPinGpsMS(timerPin) {
    const m1 = 1000 * 1000;
    const ms =
        protobufLongToNumber(timerPin.stamp.gpsTime.seconds) * 1000 +
        Math.round(timerPin.stamp.gpsTime.nanos / m1);
    return ms;
}
export function getTimerPinTickMS(timerPin) {
    const us = protobufLongToNumber(timerPin.stamp.tick64);
    //log.debug("fmtPinTime us", us);
    //log.debug("fmtPinTime us", typeof us);
    const ms = us / 1000;
    return ms;
}
export function getTimerPinActiveMS(timerPin) {
    if (!timerPin.stamp.gpsTime) {
        return [getTimerPinTickMS(timerPin), "tick64"];
    } else {
        return [getTimerPinGpsMS(timerPin), "gps"];
    }
}
export function fmtPinTime(timerPin) {
    if (!timerPin.stamp.gpsTime) {
        const ms = getTimerPinTickMS(timerPin);
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

    //log.debug("fmtPinTime from ", timerPin, " gave:", ms);
    const ms = getTimerPinGpsMS(timerPin);
    let gpsDate = new Date(ms);
    return gpsDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        fractionalSecondDigits: 3,
    });
}

export function formatWinTime(ms) {
    if (ms === 0) return "Tied";

    var timeFormatSelected = get(timeFormat);
    if (timeFormatSelected === "ms-padded-unit") {
        return ms.toString().padStart(3, "0") + " ms";
    } else if (timeFormatSelected === "ms-unpadded-nounit") {
        return ms.toString();
    } else if (timeFormatSelected === "ms-unpadded-unit") {
        return ms.toString() + " ms";
    } else if (timeFormatSelected === "s-nounit") {
        return (ms / 1000).toFixed(3);
    } else if (timeFormatSelected === "s-unit") {
        return (ms / 1000).toFixed(3) + " s";
    } else {
        // ms-padded-nounit is also the default
        return ms.toString().padStart(3, "0");
    }
}

import { onDestroy } from "svelte";

export function MqttGetTopic(clientId) {
    if (MqttIsClientEsp32(clientId)) {
        //esp32 client
        return `rr2Timer/${clientId}`;
    } else {
        // rpi client
        return `rr1Timer/${clientId}`;
    }
}
export function MqttIsClientEsp32(clientId) {
    if (clientId.match(/^rr1/i)) {
        //esp32 client
        return true;
    } else {
        // rpi client
        return false;
    }
}
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
export function secondsToHHMMSS(seconds) {
    seconds = Math.round(seconds * 100) / 100;
    var hoursLeft = Math.floor(seconds / 3600);
    var minLeft = Math.floor((seconds - hoursLeft * 3600) / 60);
    var secondsLeft = seconds - hoursLeft * 3600 - minLeft * 60;
    secondsLeft = Math.round(secondsLeft * 100) / 100;
    var answer = "";
    answer += hoursLeft < 10 ? "0" + hoursLeft : hoursLeft;
    answer += ":" + (minLeft < 10 ? "0" + minLeft : minLeft);
    answer += ":" + (secondsLeft < 10 ? "0" + secondsLeft : secondsLeft);
    return answer;
}

export function downloadFile(filename, text) {
    var element = document.createElement("a");
    element.setAttribute(
        "href",
        "data:text/plain;charset=utf-8," + encodeURIComponent(text)
    );
    element.setAttribute("download", filename);

    element.style.display = "none";
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}
export const filterMatches = (carNumber, lclFilter) => {
    if (!lclFilter) return true;
    let re = new RegExp("^" + lclFilter);
    return String(carNumber).match(re);
};
export async function augmentChartState(
    chartjson,
    chartId,
    heatPos,
    heatLetter
) {
    let posHtml = "";
    let bracketClass = "";
    const isSeed =
        chartjson.seeds.indexOf(`${heatPos}${heatLetter}`) > -1 ? true : false;
    const bracketPosKey = `${chartId}:${heatPos}`;
    log.debug("augmentChartState bracketPosKey: ", bracketPosKey);
    const bpFromDexie = await db.BracketPos.get(bracketPosKey);
    log.debug("augmentChartState gave:", bpFromDexie);
    if (isSeed) {
        bracketClass = "pendingSeed";
        posHtml = "- SEED";
    }

    if (
        heatLetter &&
        bpFromDexie &&
        bpFromDexie.pos &&
        bpFromDexie.pos[heatLetter]
    ) {
        if (bpFromDexie.pos[heatLetter].status == "ptcp") {
            posHtml = ` - ${
                bpFromDexie.pos[heatLetter].ptcp
            } ${getDriverName(bpFromDexie.pos[heatLetter].ptcp)}`;
            if (bpFromDexie.pos[heatLetter].ptcp) {
                bracketClass = "havePtcp";
            }
        } else if (bpFromDexie.pos[heatLetter].status == "bye") {
            posHtml = ` - Bye`;
            bracketClass = "haveBye";
        } else if (bpFromDexie.pos[heatLetter].status == "forfeit") {
            posHtml = ` - ${
                bpFromDexie.pos[heatLetter].ptcp
            } ${getDriverName(bpFromDexie.pos[heatLetter].ptcp)}(F)`;
            bracketClass = "haveForfeit";
        }
    } else {
        const waiting = getChartAdvancementOrigin(
            chartjson,
            chartId,
            heatPos,
            heatLetter
        );
        if (waiting) {
            posHtml = ` - ${waiting}`;
        }
    }

    let rsFromDexie = await db.RaceStanding.get(bracketPosKey);
    log.debug("isSeed: ", isSeed, rsFromDexie);
    if (rsFromDexie) {
        if (rsFromDexie.del) {
            rsFromDexie = null;
        }
    }
    if (rsFromDexie) {
        const entityFactory = new EntityFactory({});
        const rs = entityFactory.build(rsFromDexie);

        //we have 2 car numbers
        if (!rs.ph1 && !rs.ph2) {
            bracketClass = "ready";
        } else if (rs.ph1 && !rs.ph2) {
            bracketClass = "phaseOneComplete";
        } else if (rs.isComplete()) {
            bracketClass = "complete";
        }
        log.debug("isSeed2: ", isSeed, bracketClass);
    }

    //await getChartImage(bmdFromDexie.imgPath);
    //await getChartImage(bmdFromDexie.jsonPath);
    return {
        bracketClass,
        posHtml,
        isSeed,
        rsFromDexie,
    };
}
const getDriverName = (number) => {
    const driverMap = get(driverMapStore);
    if (number && driverMap[number]) {
        return driverMap[number].name;
    } else {
        return " ";
    }
};
function getChartAdvancementOrigin(chartjson, chartId, heatPos, heatLetter) {
    const needle = `${heatPos}${heatLetter}`;

    const cjp = chartjson.progress;
    for (const originHeat of Object.keys(cjp)) {
        if (cjp[originHeat].WinnerDest === needle) {
            return `W ${fmtChartOrigin(cjp, originHeat)}`;
        }
        if (cjp[originHeat].LoserDest === needle) {
            return `L ${fmtChartOrigin(cjp, originHeat)}`;
        }
    }
    return "";
}
function fmtChartOrigin(cjp, originHeat) {
    const r = cjp[originHeat]["#Round"];
    return `[${r}]Heat[${originHeat}]`;
}
export function extractS3VideoMeta(key) {
    const m = /__(_7B.*_7D)__/.exec(key);
    if (m && m.length > 1) {
        log.debug(`found meta: ${m[1]}`);
        const metaJson = decodeURIComponent(m[1].replaceAll(/_/gi, "%"));

        log.debug(`found metaJson: ${metaJson}`);
        if (metaJson) {
            const meta = JSON.parse(metaJson);
            meta.perspective = meta.p;
            meta.timerName = meta.n;
            meta.snipStart = meta.ss;
            if (meta.lMs) meta.snipEnd = meta.lMs + meta.snipStart;
            if (meta.tt) meta.tgtTimeMs = meta.tt; //deprecated
            if (meta.toMs) meta.tgtTimeMs = meta.toMs + meta.snipStart;

            if (!meta.perspective) {
                meta.perspective = "";
            }
            if (!meta.timerName) {
                meta.timerName = "";
            }
            return meta;
        }
    }
    return undefined;
}
export function getEntityFactory() {
    const entityFactory = new EntityFactory({});
    return entityFactory;
}
