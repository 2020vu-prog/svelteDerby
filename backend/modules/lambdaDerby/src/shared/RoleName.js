"use strict";

/**
 * Persisted organization role names shared by authorization code and tests.
 * Values must remain stable because OrgPerm records store them as strings.
 */
const RoleName = Object.freeze({
    POWER: "power",
    STARTER: "starter",
    STARTER_LIMITED: "starterLimited",
    REGISTRATION: "registration",
    VIDEO: "video",
    ANNOUNCER: "Announcer",
});

module.exports = RoleName;
