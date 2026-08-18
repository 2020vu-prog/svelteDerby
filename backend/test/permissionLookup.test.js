const {
    getNamedRoles,
    hasPermission,
    hasSvelteRoutePath,
} = require("../modules/lambdaDerby/src/shared/PermissionLookup.js");

test("Announcer grants the existing announcement permission", () => {
    expect(getNamedRoles()).toContain("Announcer");
    expect(hasPermission(["Announcer"], "CanInitiateAnnouncement")).toBe(true);
    expect(hasSvelteRoutePath(null, ["Announcer"], "/pa_info")).toBe(true);
    expect(hasSvelteRoutePath(null, ["Announcer"], "/ManualAnnouncement")).toBe(
        true
    );
    expect(hasSvelteRoutePath(null, ["Announcer"], "/driverAdd")).toBe(false);
});

test("power inherits the PA Info screen permission", () => {
    expect(hasPermission(["power"], "CanInitiateAnnouncement")).toBe(true);
    expect(hasSvelteRoutePath(null, ["power"], "/pa_info")).toBe(true);
});

test("registration can view PA Info through its announcement permission", () => {
    expect(hasPermission(["registration"], "CanInitiateAnnouncement")).toBe(
        true
    );
    expect(hasSvelteRoutePath(null, ["registration"], "/pa_info")).toBe(true);
});
