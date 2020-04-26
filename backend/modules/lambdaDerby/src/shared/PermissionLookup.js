'use strict'

const permissionMap = require('./permissionLits.js')
const powerUsers = ["REDACTED_PERMISSION_EMAIL", "REDACTED_PERMISSION_EMAIL"];
function lookupUserPermissions(userMail) {
    var rc = {};
    powerUsers.forEach(pue => {
        if (pue === userMail) {
            rc = { ...permissionMap.permissionMap };  // how is it nested??
        }
    });
    console.log(`permissions for ${userMail} -- `, rc)
    return rc;
}
module.exports = { lookupUserPermissions }
