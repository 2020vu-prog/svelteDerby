"use strict";

const { permissionMap, permissionMap2 } = require("./permissionLits.js");
const powerUsers = [
    "REDACTED_PERMISSION_EMAIL",
    "REDACTED_PERMISSION_EMAIL",
    "REDACTED_PERMISSION_EMAIL",
];
const hasRoutePath = (routeType, userMail, serverRoutePath) => {
    const permKeys = module.exports.lookupUserPermissions(userMail);
    console.log("permKeys:", permKeys);
    var rc = false;
    permKeys.forEach((permKey) => {
        const p2 = permissionMap2[permKey];
        if (p2 && p2.routeMatches(routeType, serverRoutePath)) {
            rc = true;
        }
    });
    console.log(`permissions for ${userMail}  ${serverRoutePath} -- `, rc);
    return rc;
};
module.exports.lookupUserPermissions = (userMail) => {
    console.log("pmap2:", Object.keys(permissionMap2));
    var grantedPerms = { Anonymous: "value ignored" };
    powerUsers.forEach((pue) => {
        if (userMail && pue.toLowerCase() === userMail.toLowerCase()) {
            grantedPerms = { ...permissionMap2 };
        }
    });
    const granted = Object.keys(grantedPerms);
    console.log(`granting permissions for ${userMail} -- `, granted);
    return granted;
};

module.exports.hasSvelteRoutePath = (userMail, svelteRoutePath) => {
    return hasRoutePath("svelte", userMail, svelteRoutePath);
};
module.exports.hasServerRoutePath = (userMail, serverRoutePath) => {
    return hasRoutePath("server", userMail, serverRoutePath);
};

//module.exports = { lookupUserPermissions }
