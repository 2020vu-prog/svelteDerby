"use strict";

const log = require("loglevel");
const { permissionMap2 } = require("./permissionLits.js");
const powerPerms = { ...permissionMap2 };
const starterPerms = { CanAddBlocks: true };
const registrationPerms = {
    CanAddBlocks: true,
    CanAddChart: true,
    ChartPosition: true,
    CanInitiateAnnouncement: true,
    Anonymous: true,
    CanAddParticipant: true,
    CanAddPending: true,
};
const permsByRoleMap = {
    power: powerPerms, // john harmon, Akron Local org
    starter: starterPerms,
    registration: registrationPerms,
};
const orgUserRoleMap = {
    "test:REDACTED_PERMISSION_EMAIL": ["power"], // john harmon, Akron Local org
    "test:REDACTED_PERMISSION_EMAIL": ["power"], // scott, Akron Local org

    "test:REDACTED_PERMISSION_EMAIL": ["power"], // jest tests
    "test60:REDACTED_PERMISSION_EMAIL": ["power"], // jest tests
    ":REDACTED_PERMISSION_EMAIL": ["power"],
    ":REDACTED_PERMISSION_EMAIL": ["power"],
    ":REDACTED_PERMISSION_EMAIL": ["power"],
    ":REDACTED_PERMISSION_EMAIL": ["starter"],

    "test:REDACTED_PERMISSION_EMAIL": ["registration"],
    "chi:REDACTED_PERMISSION_EMAIL": ["registration"],
    "test:REDACTED_PERMISSION_EMAIL": ["registration"],
    "chi:REDACTED_PERMISSION_EMAIL": ["registration"],
    "test:REDACTED_PERMISSION_EMAIL": ["registration"],
    "chi:REDACTED_PERMISSION_EMAIL": ["registration"],
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
    var grantedRoles = [];

    const k1 = `${orgIz}:${userMail}`.toLowerCase();
    const k2 = `:${userMail}`.toLowerCase(); // sysadmin?

    [k1, k2].forEach((k) => {
        log.debug(`checking permissions for ${k} -- `, grantedRoles);
        if (orgUserRoleMap[k]) {
            grantedRoles = [...grantedRoles, ...orgUserRoleMap[k]];
            log.debug(`added permissions for ${k} -- `, grantedRoles);
        }
    });

    //expand list of roles to actual perms.
    grantedRoles.forEach((role) => {
        grantedPerms = { ...grantedPerms, ...permsByRoleMap[role] };
    });

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
