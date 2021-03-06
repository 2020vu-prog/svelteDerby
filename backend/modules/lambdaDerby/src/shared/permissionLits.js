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
    "CanAddParticipant",
    ["/addParticipant", "/requestTts"],
    ["/driverAdd"]
);
addPermission(
    "CanTimerConfig",
    ["/timerConfig", "/getActiveTimers", "/getTimerHistory"],
    ["/timerConfig", "/rawTimerList"]
);
addPermission(
    "CanAddPending",
    ["/addPending"],
    ["/raceStandingAdd/RaceStanding"]
);
addPermission("CanAddBlocks", ["/addBlocks"], ["/raceStandingAdd/RacePhase"]);
// TODO: qualify with metadata!
addPermission("CanAddChart", ["/addChart"], ["/chartAdd"]);

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
    ["/initiateAnnouncement"],
    ["/ManualAnnouncement"]
);
addPermission(
    "CanDeleteStanding",
    ["/deleteRaceStanding"],
    ["/sveltePermissionCanDeleteStanding"]
);
addPermission("CanCaptureVideo", ["/requestS3PutObjectUrl"], ["/captureVideo"]);
addPermission(
    "TODO",
    [
        "/addBulk",
        "/ddbQuery",
        "/getNextOnBlocks",
        "/getRaceHistory",
        "/listChartTypes",
        "/addEventConfig",
        "/requestMqttSubPermission",
        "/listMediaPrefix",
    ],
    [
        "/orgAdd", // be careful with this one!
        "/eventAdd",
    ]
);
addPermission(
    "Anonymous",
    ["/getRaceHistory", "/requestMqttSubPermission", "/listMediaPrefix"],
    ["/drivers", "/RpList", "/RsList/History", "/RsList/Pending", "/chartList"]
);
module.exports.permissionMap = {
    "/addParticipant": "d",
    "/addPending": "p",
    "/addBlocks": "b",
    "/addChart": "B",
    "/addChartPosition": "cp",
    "/doApplyFinishTime": "f",

    "/addBulk": "bulk",
    "/ddbQuery": "ddbq",
    "/getNextOnBlocks": "gnob",
    "/getRaceHistory": "h",
    "/listChartTypes": "ct",
    "/addEventConfig": "aec",
};
