"use strict";

const Permission = require("./Permission.js");

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
addPermission("CanAddParticipant", ["/addParticipant"], ["/driverAdd"]);
addPermission(
    "CanTimerConfig",
    ["/timerConfig", "/getActiveTimers"],
    ["/timerConfig"]
);
addPermission(
    "CanAddPending",
    ["/addPending"],
    ["/raceStandingAdd/RaceStanding"]
);
addPermission("CanAddBlocks", ["/addBlocks"], ["/raceStandingAdd/RacePhase"]);
// TODO: qualify with metadata!
addPermission("CanAddChart", ["/addChart"], ["/chartAdd"]);
addPermission("ChartPosition", ["/addChartPosition"], []);
addPermission("ManualFinishTime", ["/doApplyFinishTime"], ["/ManualTimerAdd"]);
addPermission("CanDeleteBlocks", ["/deleteRacePhase"], ["/NotASvelteRouteYet"]);
addPermission(
    "CanDeleteStanding",
    ["/deleteRaceStanding"],
    ["/NotASvelteRouteYet"]
);
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
    ],
    [
        "/orgAdd", // be careful with this one!
        "/eventAdd",
    ]
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
