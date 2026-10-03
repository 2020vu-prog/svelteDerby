"use strict";
const log = require("loglevel");
const { GetParameterCommand } = require("@aws-sdk/client-ssm");

// buildResponse and getDerbyMainVersionInfo are handed around as plain
// functions (the router, route handlers, and services call them unbound), so
// this returns closures instead of a class. The version strings stay in
// derbyMain.js, where they are bumped.
function createResponseHelpers({
    ssmClient,
    clientMinimumVersion,
    derbyMainVersion,
}) {
    function buildResponse(jsonObj, cacheControl = "no-cache") {
        if (!jsonObj) {
            jsonObj = {};
        }
        return {
            statusCode: jsonObj.statusCode ? jsonObj.statusCode : 200,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": cacheControl,
                "x-client-minimum": clientMinimumVersion,
                "x-derby-main-version": derbyMainVersion,
            },
            body: JSON.stringify(jsonObj),
        };
    }

    async function getDerbyMainVersionInfo() {
        const parameterName = `/deploy/${process.env.DeployEnvironment}/git-breadcrumb`;
        const gitBreadcrumbParameterResponse = await ssmClient.send(
            new GetParameterCommand({ Name: parameterName })
        );
        const gitBreadcrumb = gitBreadcrumbParameterResponse.Parameter.Value;
        try {
            const { buildTime } = JSON.parse(gitBreadcrumb);
            const buildTimeMs = Number(buildTime);
            const monitorTestEndTimeMs = buildTimeMs + 10 * 60 * 1000;
            const nowMs = Date.now();
            if (nowMs >= buildTimeMs && nowMs <= monitorTestEndTimeMs) {
                log.error(
                    "ERROR CloudWatch monitor test from getDerbyMainVersionInfo"
                );
            }
        } catch (err) {
            log.warn("Unable to parse git breadcrumb buildTime");
        }
        return {
            version: derbyMainVersion,
            gitBreadcrumb,
        };
    }

    return { buildResponse, getDerbyMainVersionInfo };
}

module.exports = { createResponseHelpers };
