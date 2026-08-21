"use strict";

const Permission = require("./Permission.js");
const RoutePermission = require("./RoutePermission.js");

module.exports.permissionMap2 = {};
function addPermission(routePermission, serverRouteList) {
    const permissionName = RoutePermission.from(routePermission).toString();
    module.exports.permissionMap2[permissionName] = new Permission(
        permissionName,
        serverRouteList
    );
}
addPermission(RoutePermission.CAN_ADD_ORG_USER, [
    "/addOrgUser",
    "/listOrgUser",
]);
addPermission(RoutePermission.CAN_ADD_PARTICIPANT, [
    "/addParticipant",
    "/requestTts",
]);
addPermission(RoutePermission.CAN_TIMER_CONFIG, [
    "/timerConfig",
    "/getActiveTimers",
    "/getTimerHistory",
    "/getActivePbTimers",
    "/timerPbConfig",
    "/getTimerPbHistory",
]);
addPermission(RoutePermission.CAN_ADD_PENDING, ["/addPending"]);
addPermission(RoutePermission.CAN_ADD_BLOCKS, ["/addBlocks"]);
// TODO: qualify with metadata!
addPermission(RoutePermission.CAN_ADD_CHART, ["/addChart", "/listChartTypes"]);

addPermission(RoutePermission.CHART_POSITION, ["/addChartPosition"]);
addPermission(RoutePermission.MANUAL_FINISH_TIME, ["/doApplyFinishTime"]);
addPermission(RoutePermission.CAN_DELETE_BLOCKS, ["/deleteRacePhase"]);
addPermission(RoutePermission.CAN_INITIATE_ANNOUNCEMENT, [
    "/initiateAnnouncement",
    "/RaceStanding/addTag",
]);
addPermission(RoutePermission.CAN_MANAGE_DISCORD, ["/manageDiscord"]);
addPermission(RoutePermission.CAN_DELETE_STANDING, ["/deleteRaceStanding"]);
addPermission(RoutePermission.CAN_CAPTURE_VIDEO, [
    "/requestS3PutObjectUrl",
    "/requestVideoUpload",
    "/requestServerEpochMS",
]);
addPermission(RoutePermission.POWER, [
    "/addBulk",
    "/ddbQuery",
    "/getNextOnBlocks",
    "/getRaceHistory",
    "/addEventConfig",
    "/updateEventConfig",
    "/addLogMessage",
    "/requestMqttSubPermission",
    "/listMediaPrefix",
]);
addPermission(RoutePermission.ANONYMOUS, [
    "/iot/discover",
    "/getPhaseElapsed",
    "/getRaceHistory",
    "/requestMqttSubPermission",
    "/listMediaPrefix",
    "/getOrgRoles",
]);
