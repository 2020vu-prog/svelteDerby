import { derived } from "svelte/store";
import { raceConfig, roleMap, userEmail } from "../stores.js";

const { hasNamedPermission } = require("./routeAccess.js");
const RoutePermission = require("../../../backend/modules/lambdaDerby/src/shared/RoutePermission.js");

/**
 * Creates a reactive boolean store for one named frontend permission.
 *
 * The result updates whenever the authenticated email, assigned roles, or
 * selected event changes.
 *
 * @param {RoutePermission} permission
 * @param {string|null} [orgIz] Optional organization override.
 * @returns {import("svelte/store").Readable<boolean>}
 */
export function createPermissionStore(permission, orgIz = null) {
    const routePermission = RoutePermission.from(permission);
    return derived(
        [raceConfig, roleMap, userEmail],
        ([$raceConfig, $roleMap, $userEmail]) =>
            hasNamedPermission(routePermission, {
                orgIz,
                raceConfig: $raceConfig,
                roleMap: $roleMap,
                userEmail: $userEmail,
            })
    );
}
