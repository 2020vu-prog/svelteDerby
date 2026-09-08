"use strict";

const RoutePermission = require("./shared/RoutePermission.js");

class ParticipantService {
    constructor(ddbUtils) {
        this.ddbUtils = ddbUtils;
    }

    registerRoutes(router, { buildResponse }) {
        router.register("/deleteParticipant", {
            permission: RoutePermission.CAN_ADD_PARTICIPANT,
            handler: async (event, context) =>
                buildResponse(
                    await this.logicalDelete(
                        JSON.parse(event.body || "{}"),
                        context
                    )
                ),
        });
        return router;
    }

    async logicalDelete(json, context) {
        const number = json.number == null ? "" : String(json.number);
        if (!number) {
            return { status: "error", error: "Missing participant number." };
        }

        const participant = await this.ddbUtils.ddbQueryPkSk(
            `${context.orgId}:PTCP`,
            number
        );
        if (!participant) {
            return {
                status: "error",
                error: `Participant [${number}] not found.`,
            };
        }

        // Retain the full record as a tombstone so the deletion propagates
        // through the same history/MQTT stream as every other entity update.
        if (participant.del) {
            return { status: "ok", entity: participant };
        }
        participant.del = true;
        return this.ddbUtils.addSingle(participant);
    }
}

module.exports = ParticipantService;
