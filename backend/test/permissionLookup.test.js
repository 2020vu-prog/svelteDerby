const {
    getNamedRoles,
    hasPermission,
} = require("../modules/lambdaDerby/src/shared/PermissionLookup.js");

test("Announcer grants the existing announcement permission", () => {
    expect(getNamedRoles()).toContain("Announcer");
    expect(hasPermission(["Announcer"], "CanInitiateAnnouncement")).toBe(true);
});

test("power inherits the PA Info screen permission", () => {
    expect(hasPermission(["power"], "CanInitiateAnnouncement")).toBe(true);
});

test("registration can view PA Info through its announcement permission", () => {
    expect(hasPermission(["registration"], "CanInitiateAnnouncement")).toBe(
        true
    );
});
