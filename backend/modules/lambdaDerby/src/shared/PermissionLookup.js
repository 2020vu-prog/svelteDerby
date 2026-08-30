"use strict";

const log = require("loglevel");
const { permissionMap2 } = require("./permissionLits.js");
const RoutePermission = require("./RoutePermission.js");
const RoleName = require("./RoleName.js");
const powerPerms = { ...permissionMap2 };
const starterLimitedPerms = {
    [RoutePermission.CAN_ADD_BLOCKS.toString()]: true,
};
const starterPerms = {
    [RoutePermission.CAN_ADD_BLOCKS.toString()]: true,
    [RoutePermission.CAN_DELETE_BLOCKS.toString()]: true,
};
const registrationPerms = {
    [RoutePermission.CAN_ADD_BLOCKS.toString()]: true,
    [RoutePermission.CAN_ADD_CHART.toString()]: true,
    [RoutePermission.CHART_POSITION.toString()]: true,
    [RoutePermission.CAN_INITIATE_ANNOUNCEMENT.toString()]: true,
    [RoutePermission.ANONYMOUS.toString()]: true,
    [RoutePermission.CAN_ADD_PARTICIPANT.toString()]: true,
    [RoutePermission.CAN_ADD_PENDING.toString()]: true,
    [RoutePermission.CAN_MANAGE_DISCORD.toString()]: true,
};
const videoPerms = {
    [RoutePermission.CAN_CAPTURE_VIDEO.toString()]: true,
};
const announcerPerms = {
    [RoutePermission.CAN_INITIATE_ANNOUNCEMENT.toString()]: true,
};

const permsByRoleMap = {
    [RoleName.POWER]: powerPerms,
    [RoleName.STARTER]: starterPerms,
    [RoleName.STARTER_LIMITED]: starterLimitedPerms,
    [RoleName.REGISTRATION]: registrationPerms,
    [RoleName.VIDEO]: videoPerms,
    [RoleName.ANNOUNCER]: announcerPerms,
};
function roleHasRoutePath(orgIz, roleList, routePath) {
    log.debug("TODO: routepath:");
    const permKeys = getRolePermissions(roleList);
    return isRoutePathInPermissionList(permKeys, routePath);
}

function isRoutePathInPermissionList(permList, routePath) {
    log.debug("permList:", permList);
    var rc = false;
    permList.forEach((permKey) => {
        const p2 = permissionMap2[permKey];
        if (p2 && p2.routeMatches(routePath)) {
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

    grantedPerms[RoutePermission.ANONYMOUS.toString()] = "value ignored";
    const granted = Object.keys(grantedPerms);
    log.debug(`permissions for ${roleList} -- `, granted);
    return granted; // list of perms
}

module.exports.hasPermission = (roleList, permissionName) => {
    return getRolePermissions(roleList).includes(permissionName);
};

module.exports.hasServerRoutePath = (orgIz, roleList, serverRoutePath) => {
    return roleHasRoutePath(orgIz, roleList, serverRoutePath);
};
module.exports.getNamedRoles = getNamedRoles;
module.exports.getRolePermissions = getRolePermissions;
