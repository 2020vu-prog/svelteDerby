const {
    getNamedRoles,
    getRolePermissions,
    hasPermission,
} = require("../modules/lambdaDerby/src/shared/PermissionLookup.js");
const RoleName = require("../modules/lambdaDerby/src/shared/RoleName.js");

test("role definitions use every shared role name", () => {
    expect(getNamedRoles()).toEqual(Object.values(RoleName).sort());
});

test("Announcer grants the existing announcement permission", () => {
    expect(hasPermission([RoleName.ANNOUNCER], "CanInitiateAnnouncement")).toBe(
        true
    );
});

test("power inherits the PA Info screen permission", () => {
    expect(hasPermission([RoleName.POWER], "CanInitiateAnnouncement")).toBe(
        true
    );
});

test("registration can view PA Info through its announcement permission", () => {
    expect(
        hasPermission([RoleName.REGISTRATION], "CanInitiateAnnouncement")
    ).toBe(true);
});

test("registration can manage Spotify", () => {
    expect(hasPermission([RoleName.REGISTRATION], "CanManageSpotify")).toBe(
        true
    );
});

test("resolved permissions combine selected roles without duplicates", () => {
    expect(
        getRolePermissions([RoleName.STARTER, RoleName.STARTER_LIMITED]).sort()
    ).toEqual(["Anonymous", "CanAddBlocks", "CanDeleteBlocks"]);
});
