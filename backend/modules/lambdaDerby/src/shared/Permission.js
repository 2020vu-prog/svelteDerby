"use strict";
const log = require("loglevel");
class Permission {
    //propOverrides = {}
    constructor(permissionName, serverRouteList) {
        this.permissionName = permissionName;
        this.serverRouteList = serverRouteList;
    }
    routeMatches(tgtRoute) {
        var rc = false;
        this.serverRouteList.forEach((allowedRoute) => {
            if (tgtRoute && tgtRoute.startsWith(allowedRoute)) {
                rc = true;
            }
        });
        return rc;
    }
}
module.exports = Permission;
