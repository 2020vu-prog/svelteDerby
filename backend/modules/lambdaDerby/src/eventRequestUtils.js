"use strict";

/**
 * Helpers that read the organization/event identity and a few small values
 * out of a Lambda request, with no AWS or other dependencies. Backend only,
 * so it lives beside the other Lambda helpers rather than in shared/, which
 * holds the modules the frontend imports. Extracted verbatim from
 * derbyMain.js (step 1 of docs/TODO/DerbyMainRefactorProposal.md); behavior is
 * intentionally unchanged, including the quirks the tests pin.
 */

const getOrgId = (event) => {
    if (event.body) {
        return JSON.parse(event.body).orgId;
    }
    if (event.queryStringParameters) {
        return event.queryStringParameters.orgId;
    }
    if (event.orgId) {
        return event.orgId;
    }
    return null;
};
const getOrgIz = (event) => {
    if (event.body) {
        return JSON.parse(event.body).orgIz;
    }
    if (event.queryStringParameters) {
        return event.queryStringParameters.orgIz;
    }
    if (event.orgIz) {
        return event.orgIz;
    }
    return null;
};
const getEventKey = (event) => {
    return getOrgIz(event) + ":" + getOrgId(event);
};
const getTtl = async (config) => {
    if (config) {
        return config.TTL;
    }
    return null;
    //return Math.round((new Date().getTime() / 1000) + config.ttlIncrement);
};
const stringIsTrue = (stringValue) => {
    return stringValue.toLowerCase() == "true" ? true : false;
};

const noopAsync = async (json) => {
    return []; // empty list will cause rsUpdate to stand down
};

module.exports = {
    getOrgId,
    getOrgIz,
    getEventKey,
    getTtl,
    stringIsTrue,
    noopAsync,
};
