"use strict";

/**
 * Immutable, enum-like route permission value.
 *
 * Permission values remain string-compatible because roles are persisted and
 * evaluated by their existing string names.
 */
class RoutePermission {
    /**
     * @param {string} name Persisted permission name.
     */
    constructor(name) {
        if (!name || typeof name !== "string") {
            throw new TypeError("Route permission requires a string name");
        }
        this.name = name;
        Object.freeze(this);
    }

    /** @returns {string} Persisted permission name. */
    toString() {
        return this.name;
    }

    /** @returns {string} JSON representation used by inventories and logs. */
    toJSON() {
        return this.name;
    }

    /**
     * Validates a route permission value.
     *
     * @param {*} permission Candidate permission.
     * @returns {RoutePermission} Validated permission.
     * @throws {TypeError} If the value is not a RoutePermission.
     */
    static from(permission) {
        if (!(permission instanceof RoutePermission)) {
            throw new TypeError("Route permission must be a RoutePermission");
        }
        return permission;
    }
}

RoutePermission.PUBLIC = new RoutePermission("Public");
RoutePermission.ANONYMOUS = new RoutePermission("Anonymous");
RoutePermission.CAN_WALK_ON_WATER = new RoutePermission("CanWalkOnWater");
RoutePermission.CAN_ADD_ORG_USER = new RoutePermission("CanAddOrgUser");
RoutePermission.CAN_ADD_PARTICIPANT = new RoutePermission("CanAddParticipant");
RoutePermission.CAN_TIMER_CONFIG = new RoutePermission("CanTimerConfig");
RoutePermission.CAN_ADD_PENDING = new RoutePermission("CanAddPending");
RoutePermission.CAN_ADD_BLOCKS = new RoutePermission("CanAddBlocks");
RoutePermission.CAN_ADD_CHART = new RoutePermission("CanAddChart");
RoutePermission.CHART_POSITION = new RoutePermission("ChartPosition");
RoutePermission.MANUAL_FINISH_TIME = new RoutePermission("ManualFinishTime");
RoutePermission.CAN_DELETE_BLOCKS = new RoutePermission("CanDeleteBlocks");
RoutePermission.CAN_INITIATE_ANNOUNCEMENT = new RoutePermission(
    "CanInitiateAnnouncement"
);
RoutePermission.CAN_MANAGE_DISCORD = new RoutePermission("CanManageDiscord");
RoutePermission.CAN_DELETE_STANDING = new RoutePermission("CanDeleteStanding");
RoutePermission.CAN_CAPTURE_VIDEO = new RoutePermission("CanCaptureVideo");

Object.freeze(RoutePermission);

module.exports = RoutePermission;
