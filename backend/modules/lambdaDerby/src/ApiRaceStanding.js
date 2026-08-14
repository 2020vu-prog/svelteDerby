const log = require("loglevel");
const { getSourceName } = require("./utils");
const {
    PublishCommand: SnsPublishCommand,
    SNSClient,
} = require("@aws-sdk/client-sns");
class ApiRaceStanding {
    ddbUtils = null;
    announceResults = null;
    logUtils = null;

    constructor(
        ddbUtils,
        announceResults,
        logUtils,
        snsClient = new SNSClient()
    ) {
        this.ddbUtils = ddbUtils;
        this.announceResults = announceResults;
        this.logUtils = logUtils;
        this.sns = snsClient;
    }
    async deleteRaceStanding(json) {
        log.debug(
            "ApiRaceStanding.deleteRaceStanding: " + JSON.stringify(json)
        );
        const rsFound = await this.ddbUtils.ddbQueryPkSk(
            `${json.orgId}:RS`,
            json.SK
        );
        log.debug("rsFound", rsFound);
        var msg = "";

        if (!rsFound) {
            return {
                status: "error",
                error: "Cannot delete RaceStanding. Not found.",
            };
        }
        if (false) {
        } else if (rsFound.ph2 && rsFound.ph1 && json.tgtName === "B-Phase") {
            delete rsFound.ph2;
            msg = "Deleted [B] phase.";
        } else if (!rsFound.ph2 && rsFound.ph1 && json.tgtName === "A-Phase") {
            delete rsFound.ph1;
            msg = "Deleted [A] phase.";
        } else if (!rsFound.ph2 && !rsFound.ph1 && json.tgtName === "Pending") {
            rsFound.del = true;
            msg = "Deleted pending race.";
        } else {
            return {
                status: "error",
                error: "Invalid request",
            };
        }

        const rc = await this.ddbUtils.addSingle(rsFound);
        if (rc.status === "ok") {
            rc.text = msg;
            await this.logDeleteRaceStanding(json, rc);
        }
        return rc;
    }
    async logDeleteRaceStanding(deleteRequest, deleteResult) {
        const raceStanding = deleteResult.entity || {};
        const reason =
            String(deleteRequest.reason || "").trim() || "No reason provided";
        const carNumbers = Array.isArray(raceStanding.cn)
            ? raceStanding.cn.join(" and ")
            : "unknown cars";
        await this.logUtils.persistLogMessage({
            orgId: deleteRequest.orgId,
            message: `Deleted ${deleteRequest.tgtName} from race [${deleteRequest.SK}] with cars [${carNumbers}]: ${reason}`,
            level: "info",
            source: getSourceName(),
            detail: {
                reason,
                targetName: deleteRequest.tgtName,
                raceStandingKey: deleteRequest.SK,
                carNumbers: raceStanding.cn,
                deleteResultText: deleteResult.text,
            },
        });
    }
    async addTag(json) {
        log.debug("addTag: " + JSON.stringify(json));
        if (!json.tags) {
            return {
                status: "error",
                error: "Invalid request.",
            };
        }
        const rsFound = await this.ddbUtils.ddbQueryPkSk(
            `${json.orgId}:RS`,
            json.SK
        );

        if (!rsFound) {
            return {
                status: "error",
                error: "Cannot tag RaceStanding. Not found.",
            };
        }
        const newTags = rsFound.tags;
        const calledNumbers = []; // list of called CarNumbers
        //outer loop is participants
        json.tags.forEach((participantTags, i) => {
            for (const tag of Object.keys(participantTags)) {
                newTags[i][tag] = new Date().getTime();
                if (tag === "called") {
                    calledNumbers.push(rsFound.carNumbers[i]);
                }
            }
        });
        log.debug("newTags: " + JSON.stringify(newTags));
        log.debug("calledNumbers: " + JSON.stringify(calledNumbers));

        rsFound.tags = newTags;
        if (calledNumbers.length > 0) {
            await this.snsFanoutRaceStatus(calledNumbers);
            // august2021 announcements too frequent/distracting (cjw)
            // august2021 announcements need more attention getting (mm)
            //await this.announceResults.formatAndSubmitCallToRace(rsFound);
        }

        const rc = await this.ddbUtils.addSingle(rsFound);
        if (rc.status === "ok") {
            rc.text = "Tags added";
        }
        return rc;
    }
    async snsFanoutRaceStatus(jsonCalledNumbers) {
        const carsAndNames = {
            cars: [
                //{ number: 888, name: "foo" },
                //{ number: 889, name: "bar" },
            ],
        };
        jsonCalledNumbers.forEach((number) => {
            carsAndNames.cars.push({
                number: number,
                name: `name of ${number}`,
            });
        });
        const tsrc =
            "Calling {{cars.length}} cars to race:\n" +
            "{{#cars}}Car Number: {{number}} is {{name}}\n{{/cars}}";
        const Handlebars = require("handlebars");
        const template = Handlebars.compile(tsrc);

        const fanoutArn = process.env.RacerStatusFanoutSnsArn;
        const cnString = JSON.stringify(jsonCalledNumbers);
        var params = {
            //Message: JSON.stringify(jsonCarNumbers),
            Message: template(carsAndNames),
            TopicArn: fanoutArn,
            Subject: `Car Numbers called: ${cnString}`,

            MessageAttributes: {
                carNumber: {
                    DataType: "String.Array",
                    StringValue: cnString,
                },
            },
        };

        try {
            console.log("SNS sending fanout:", params);
            const sent = await this.sns.send(new SnsPublishCommand(params));
            console.log("SNS send Success", sent);
        } catch (err) {
            console.log("SNS send Error", err);
        }
    }
}

module.exports = ApiRaceStanding;
