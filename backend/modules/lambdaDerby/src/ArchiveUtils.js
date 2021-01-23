const EntityFactory = require("./shared/EntityFactory.js");
class ArchiveUtils {
    AWS = null;
    ddbUtils = null;

    constructor(AWS, ddbUtils) {
        this.AWS = AWS;
        this.ddbUtils = ddbUtils;
    }

    async asyncForEach(array, callback) {
        for (let index = 0; index < array.length; index++) {
            await callback(array[index], index, array);
        }
    }

    async processExpiringEventConfig() {
        console.log("Archive processExpiringEventConfig: ");

        // archive when TTL is within next hour.
        var eligibleArchive = new Date().getTime() / 1000 + 3600;

        var events = await this.ddbUtils.ddbQueryPkAll("EventConfig");

        console.log(
            "Archive processExpiringEventConfig eligibleArchive: ",
            eligibleArchive
        );

        console.log("allEvents:", events);
        const expiringEvents = events
            .filter((evt) => !evt.archived)
            .filter((evt) => evt.TTL < eligibleArchive);
        console.log("expiring Events:", expiringEvents);

        for (let index = 0; index < expiringEvents.length; index++) {
            const evt = expiringEvents[index];

            console.log("archiving event:", evt);
            evt.TTL += 3600 * 24 * 365 * 5;
            evt.archived = "true";

            const entityFactory = new EntityFactory({});
            var eventEntity = entityFactory.build(evt);

            this.ddbUtils.setEntityFactory(entityFactory);
            await this.ddbUtils.addSingle(eventEntity);

            console.log("sleeping begin:-(");
            await this.sleep(3000); //   :-( Need archive flag update to propagate to DerbyDst BEFORE sending CCF
            console.log("sleeping done :-(");

            await this.ddbUtils.requestCC(evt, "CCF"); //CCFinal
        }
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
module.exports = ArchiveUtils;
