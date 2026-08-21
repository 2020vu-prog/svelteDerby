const EntityFactory = require("./shared/EntityFactory.js");
const log = require("loglevel");
const requestContext = require("./RequestContext");
class ArchiveUtils {
    ddbUtils = null;

    constructor(ddbUtils) {
        this.ddbUtils = ddbUtils;
    }

    async asyncForEach(array, callback) {
        for (let index = 0; index < array.length; index++) {
            await callback(array[index], index, array);
        }
    }

    async processExpiringEventConfig() {
        log.debug("Archive processExpiringEventConfig: ");

        // archive when TTL is within next hour.
        var eligibleArchive = new Date().getTime() / 1000 + 3600;

        var events = await this.ddbUtils.ddbQueryPkAll("EventConfig");

        log.debug(
            "Archive processExpiringEventConfig eligibleArchive: ",
            eligibleArchive
        );

        log.debug("allEvents:", events);
        const expiringEvents = events
            .filter((evt) => !evt.archived)
            .filter((evt) => evt.TTL < eligibleArchive);
        log.debug("expiring Events:", expiringEvents);

        for (let index = 0; index < expiringEvents.length; index++) {
            const evt = expiringEvents[index];

            log.debug("archiving event:", evt);
            evt.TTL += 3600 * 24 * 365 * 5;
            evt.archived = "true";

            const entityFactory = new EntityFactory({});
            var eventEntity = entityFactory.build(evt);

            await requestContext.withEntityFactory(entityFactory, () =>
                this.ddbUtils.addSingle(eventEntity)
            );

            log.debug("sleeping begin:-(");
            await this.sleep(3000); //   :-( Need archive flag update to propagate to DerbyDst BEFORE sending CCF
            log.debug("sleeping done :-(");

            await this.ddbUtils.requestCC(evt, "CCF"); //CCFinal
        }
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
module.exports = ArchiveUtils;
