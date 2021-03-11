"use strict";

const log = require("loglevel");
const { permissionMap, permissionMap2 } = require("./permissionLits.js");
const powerPerms = { ...permissionMap2 };
const starterPerms = { CanAddBlocks: true };
const orgUserPermMap = {
    "test:REDACTED_PERMISSION_EMAIL": powerPerms, // john harmon, Akron Local org
    "test:REDACTED_PERMISSION_EMAIL": powerPerms, // scott, Akron Local org

    "test:REDACTED_PERMISSION_EMAIL": powerPerms, // jest tests
    "test60:REDACTED_PERMISSION_EMAIL": powerPerms, // jest tests
    ":REDACTED_PERMISSION_EMAIL": powerPerms,
    ":REDACTED_PERMISSION_EMAIL": powerPerms,
    ":REDACTED_PERMISSION_EMAIL": powerPerms,
    ":REDACTED_PERMISSION_EMAIL": starterPerms,
};
function hasRoutePath(routeType, orgIz, userMail, serverRoutePath) {
    const permKeys = lookupUserPermissions(orgIz, userMail);
    log.debug("permKeys:", permKeys);
    var rc = false;
    permKeys.forEach((permKey) => {
        const p2 = permissionMap2[permKey];
        if (p2 && p2.routeMatches(routeType, serverRoutePath)) {
            rc = true;
        }
    });
    log.debug(`permissions for ${userMail}  ${serverRoutePath} -- `, rc);
    return rc;
}
function lookupUserPermissions(orgIz, userMail) {
    //log.debug("pmap2:", Object.keys(permissionMap2));
    var grantedPerms = {};

    const k1 = `${orgIz}:${userMail}`.toLowerCase();
    const k2 = `:${userMail}`.toLowerCase(); // sysadmin?

    if (orgUserPermMap[k1]) {
        grantedPerms = orgUserPermMap[k1];
    }
    if (orgUserPermMap[k2]) {
        grantedPerms = orgUserPermMap[k2];
    }

    grantedPerms.Anonymous = "value ignored";
    const granted = Object.keys(grantedPerms);
    log.debug(`granting permissions for ${userMail} -- `, granted);
    return granted;
}

module.exports.hasSvelteRoutePath = (orgIz, userMail, svelteRoutePath) => {
    return hasRoutePath("svelte", orgIz, userMail, svelteRoutePath);
};
module.exports.hasServerRoutePath = (orgIz, userMail, serverRoutePath) => {
    return hasRoutePath("server", orgIz, userMail, serverRoutePath);
};
