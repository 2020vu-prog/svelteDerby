'use strict'

const { permissionMap, permissionMap2 } = require('./permissionLits.js')
const powerUsers = ["REDACTED_PERMISSION_EMAIL", "REDACTED_PERMISSION_EMAIL"];
const hasRoutePath = (routeType, userMail, serverRoutePath) => {
    const permKeys = module.exports.lookupUserPermissions(userMail);
    console.log("permKeys:", permKeys);
    var rc = false;
    permKeys.forEach(permKey => {
        const p2 = permissionMap2[permKey];
        if (p2 && p2.routeMatches(routeType, serverRoutePath)) {
            rc = true;
        }
    });
    console.log(`permissions for ${userMail}  ${serverRoutePath} -- `, rc)
    return rc;
}
module.exports.lookupUserPermissions = (userMail) => {
    console.log("pmap2:", Object.keys(permissionMap2));
    var rc = [];
    powerUsers.forEach(pue => {
        if (pue === userMail) {
            rc = [...Object.keys(permissionMap2)];
        }
    });
    console.log(`permissions for ${userMail} -- `, rc)
    return rc;
}

module.exports.hasSvelteRoutePath = (userMail, svelteRoutePath) => {
    return (hasRoutePath("svelte", userMail, svelteRoutePath))
}
module.exports.hasServerRoutePath = (userMail, serverRoutePath) => {
    return (hasRoutePath("server", userMail, serverRoutePath))
}

//module.exports = { lookupUserPermissions }
