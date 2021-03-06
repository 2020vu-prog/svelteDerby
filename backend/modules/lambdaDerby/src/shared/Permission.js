"use strict";
const log = require("loglevel");
class Permission {
    //propOverrides = {}
    constructor(permissionName, serverRouteList, svelteRouteList) {
        this.permissionName = permissionName;
        this.serverRouteList = serverRouteList;
        this.svelteRouteList = svelteRouteList;
    }
    routeMatches(routeType, tgtRoute) {
        const allowedRouteList =
            routeType === "server"
                ? this.serverRouteList
                : this.svelteRouteList;
        var rc = false;
        allowedRouteList.forEach((allowedRoute) => {
            if (tgtRoute && tgtRoute.startsWith(allowedRoute)) {
                rc = true;
            }
        });
        return rc;
    }
}
module.exports = Permission;
