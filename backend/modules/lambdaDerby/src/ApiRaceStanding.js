const log = require("loglevel");
class ApiRaceStanding {
    AWS = null;
    ddbUtils = null;
    announceResults = null;

    constructor(AWS, ddbUtils, announceResults) {
        this.AWS = AWS;
        this.ddbUtils = ddbUtils;
        this.announceResults = announceResults;
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
        }
        return rc;
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
            await this.announceResults.formatAndSubmitCallToRace(rsFound);
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
            const sent = await new this.AWS.SNS({ apiVersion: "2010-03-31" })
                .publish(params)
                .promise();
            console.log("SNS send Success", sent);
        } catch (err) {
            console.log("SNS send Error", err);
        }
    }
}

module.exports = ApiRaceStanding;
