const {
    getNamedRoles,
    hasPermission,
    hasSvelteRoutePath,
} = require("../modules/lambdaDerby/src/shared/PermissionLookup.js");

test("Announcer grants only the PA Info screen permission", () => {
    expect(getNamedRoles()).toContain("Announcer");
    expect(hasPermission(["Announcer"], "CanAnnounce")).toBe(true);
    expect(hasSvelteRoutePath(null, ["Announcer"], "/pa_info")).toBe(true);
    expect(hasSvelteRoutePath(null, ["Announcer"], "/driverAdd")).toBe(
        false
    );
});

test("power inherits the PA Info screen permission", () => {
    expect(hasPermission(["power"], "CanAnnounce")).toBe(true);
    expect(hasSvelteRoutePath(null, ["power"], "/pa_info")).toBe(true);
});
