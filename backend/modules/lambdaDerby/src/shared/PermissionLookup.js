"use strict";

const log = require("loglevel");
const { permissionMap2 } = require("./permissionLits.js");
const powerPerms = { ...permissionMap2 };
const starterLimitedPerms = { CanAddBlocks: true };
const starterPerms = { CanAddBlocks: true, CanDeleteBlocks: true };
const registrationPerms = {
    CanAddBlocks: true,
    CanAddChart: true,
    ChartPosition: true,
    CanInitiateAnnouncement: true,
    Anonymous: true,
    CanAddParticipant: true,
    CanAddPending: true,
    CanManageDiscord: true,
};
const videoPerms = {
    CanCaptureVideo: true,
};

const permsByRoleMap = {
    power: powerPerms, // john harmon, Akron Local org
    starter: starterPerms,
    starterLimited: starterLimitedPerms,
    registration: registrationPerms,
    video: videoPerms,
};
function roleHasRoutePath(routeType, orgIz, roleList, routePath) {
    log.debug("TODO: routepath:");
    const permKeys = getRolePermissions(roleList);
    return isRoutePathInPermissionList(routeType, permKeys, routePath);
}

function isRoutePathInPermissionList(routeType, permList, routePath) {
    log.debug("permList:", permList);
    var rc = false;
    permList.forEach((permKey) => {
        const p2 = permissionMap2[permKey];
        if (p2 && p2.routeMatches(routeType, routePath)) {
            rc = true;
        }
    });
    log.debug(`permissions for  ${routePath} -- `, rc);
    return rc;
}
function getNamedRoles() {
    return Object.keys(permsByRoleMap).sort();
}
function getRolePermissions(roleList) {
    //expand list of roles to actual perms.
    var grantedPerms = {};
    if (!roleList) {
        roleList = [];
    }

    //log.debug(`getRolePermissions roleList: ${roleList} `);
    roleList.forEach((role) => {
        grantedPerms = { ...grantedPerms, ...permsByRoleMap[role] };
    });

    grantedPerms.Anonymous = "value ignored";
    const granted = Object.keys(grantedPerms);
    log.debug(`permissions for ${roleList} -- `, granted);
    return granted; // list of perms
}

module.exports.hasSvelteRoutePath = (orgIz, roleList, svelteRoutePath) => {
    return roleHasRoutePath("svelte", orgIz, roleList, svelteRoutePath);
};
module.exports.hasServerRoutePath = (orgIz, roleList, serverRoutePath) => {
    return roleHasRoutePath("server", orgIz, roleList, serverRoutePath);
};
module.exports.getNamedRoles = getNamedRoles;
