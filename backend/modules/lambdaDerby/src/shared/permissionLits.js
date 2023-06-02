"use strict";

const Permission = require("./Permission.js");
const log = require("loglevel");

//module.exports.ModifyParticipant = "CanAddParticipant"
module.exports.ModifyPending = "CanAddPending";
module.exports.ModifyBlocks = "CanAddBlocks";
module.exports.ModifyCharts = "CanAddBlocks";
module.exports.ApplyManualTimerResults = "ManualTimer";
module.exports.CanGetNextOnBlocks = "gnob";
module.exports.ModifyEventConfig = "EventConfig";
module.exports.permissionMap2 = {};
function addPermission(pname, serverRouteList, svelteRouteList) {
    module.exports[pname] = pname;
    module.exports.permissionMap2[pname] = new Permission(
        pname,
        serverRouteList,
        svelteRouteList
    );
}
addPermission(
    "CanAddOrgUser",
    ["/addOrgUser", "/listOrgUser"],
    ["/orgUserAdd", "/orgUserList"]
);
addPermission(
    "CanAddParticipant",
    ["/addParticipant", "/requestTts"],
    ["/driverAdd"]
);
addPermission(
    "CanTimerConfig",
    [
        "/timerConfig",
        "/getActiveTimers",
        "/getTimerHistory",
        "/getActivePbTimers",
        "/timerPbConfig",
        "/getTimerPbHistory",
    ],
    ["/timerConfig", "/rawTimerList", "/timerConfigList"]
);
addPermission(
    "CanAddPending",
    ["/addPending"],
    ["/raceStandingAdd/RaceStanding"]
);
addPermission("CanAddBlocks", ["/addBlocks"], ["/raceStandingAdd/RacePhase"]);
// TODO: qualify with metadata!
addPermission("CanAddChart", ["/addChart", "/listChartTypes"], ["/chartAdd"]);

// svelte /addChartPosition is not a svelte route, but is used with isUserAllowedRoutePath()
addPermission("ChartPosition", ["/addChartPosition"], ["/addChartPosition"]);
addPermission("ManualFinishTime", ["/doApplyFinishTime"], ["/ManualTimerAdd"]);
addPermission(
    "CanDeleteBlocks",
    ["/deleteRacePhase"],
    ["/sveltePermissionCanDeleteBlocks"]
);
addPermission(
    "CanInitiateAnnouncement",
    ["/initiateAnnouncement", "/RaceStanding/addTag"],
    ["/ManualAnnouncement"]
);
addPermission("CanManageDiscord", ["/manageDiscord"], ["/manageDiscord"]);
addPermission(
    "CanDeleteStanding",
    ["/deleteRaceStanding"],
    ["/sveltePermissionCanDeleteStanding"]
);
addPermission("CanCaptureVideo", ["/requestS3PutObjectUrl"], ["/captureVideo"]);
addPermission(
    "TODO_permissions_power?",
    [
        "/addBulk",
        "/ddbQuery",
        "/getNextOnBlocks",
        "/getRaceHistory",
        "/addEventConfig",
        "/updateEventConfig",
        "/requestMqttSubPermission",
        "/listMediaPrefix",
    ],
    [
        "/orgAdd", // be careful with this one!
        "/eventAdd",
        "/svelteDriverJson", // not a svelte route, but is used with isUserAllowedRoutePath()
    ]
);
addPermission(
    "Anonymous",
    [
        "/getPhaseElapsed",
        "/getRaceHistory",
        "/requestMqttSubPermission",
        "/listMediaPrefix",
        "/getOrgRoles",
    ],
    ["/drivers", "/RpList", "/RsList/History", "/RsList/Pending", "/chartList"]
);
