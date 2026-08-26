"use strict";
const crypto = require("crypto");
const requestContext = require("./RequestContext");
const RoutePermission = require("./shared/RoutePermission.js");

const DRIVER_DELEGATION_TOKEN_LIFETIME_MS = 20 * 60 * 1000;
const DRIVER_DELEGATION_TOKEN_PK = (orgId) => `${orgId}:DriverDelegationToken`;
const isAuthenticated = (context) =>
    Boolean(context.email && context.email !== "Anonymous");

/**
 * Backs the QR-code walkup-track delegation flow: staff (CAN_ADD_PARTICIPANT)
 * mints a short-lived, single-use claim token for one driver number; the
 * driver claims it once authenticated, which adds their email hash to that
 * driver's `maintainerHashes` set so they can maintain their own walkup
 * track going forward, without ever storing their plaintext email address.
 */
class DriverDelegationService {
    ddbUtils = null;

    constructor(ddbUtils) {
        this.ddbUtils = ddbUtils;
    }

    /**
     * Installs this service's routes onto an ApiRouter -- an ApiRouter
     * "plugin" per its own `.use(plugin)` convention (see ApiRouter.js),
     * the same mechanism `registerPublicRoutes`/`registerCoreRoutes` in
     * derbyMain.js already use. Keeps route ownership (paths, permissions,
     * body parsing) colocated with the logic that implements them, instead
     * of derbyMain.js re-declaring a thin wrapper per method.
     *
     * @param {import("./ApiRouter.js")} router
     * @param {{buildResponse: function}} deps `buildResponse` is
     * constructed in derbyMain.js (it needs module version/build info that
     * lives there), so it's passed in rather than duplicated here.
     */
    registerRoutes(router, { buildResponse }) {
        router.register("/createDriverDelegation", {
            permission: RoutePermission.CAN_ADD_PARTICIPANT,
            handler: async (event, apiProps) =>
                buildResponse(
                    await this.createDelegation(
                        JSON.parse(event.body),
                        apiProps
                    )
                ),
        });
        router.register("/claimDriverDelegation", {
            permission: RoutePermission.ANONYMOUS,
            handler: async (event, apiProps) =>
                buildResponse(
                    await this.claim(JSON.parse(event.body), apiProps)
                ),
        });
        router.register("/updateDriverWalkup", {
            permission: RoutePermission.ANONYMOUS,
            handler: async (event, apiProps) =>
                buildResponse(
                    await this.updateWalkup(JSON.parse(event.body), apiProps)
                ),
        });
        router.register("/revokeDriverMaintainer", {
            permission: RoutePermission.CAN_ADD_PARTICIPANT,
            handler: async (event, apiProps) =>
                buildResponse(
                    await this.revokeMaintainer(
                        JSON.parse(event.body),
                        apiProps
                    )
                ),
        });
        router.register("/getDriverDelegationToken", {
            permission: RoutePermission.PUBLIC,
            loadContext: false,
            handler: async (event) =>
                buildResponse(
                    await this.previewToken(event.queryStringParameters || {})
                ),
        });
        return router;
    }

    /**
     * Public preview lookup so the claim screen can show what's being
     * claimed (or a clear expiry message) before requiring login.
     *
     * @param {{orgId?: string, token?: string}} qs
     */
    async previewToken(qs) {
        if (!qs.orgId || !qs.token) {
            return { error: "Missing orgId or token", statusCode: 400 };
        }
        const record = await this.ddbUtils.ddbQueryPkSk(
            DRIVER_DELEGATION_TOKEN_PK(qs.orgId),
            qs.token,
            process.env.ElapsedTempDbTable
        );
        if (!record || Date.now() > record.expiresAt) {
            return { valid: false };
        }
        return { valid: true, number: record.number };
    }

    async createDelegation(json, context) {
        const carNumber = json.number != null ? String(json.number) : "";
        if (!carNumber) {
            return { error: "Missing number", statusCode: 400 };
        }
        const token = crypto.randomBytes(16).toString("base64url");
        const expiresAt = Date.now() + DRIVER_DELEGATION_TOKEN_LIFETIME_MS;
        const record = {
            PK: DRIVER_DELEGATION_TOKEN_PK(context.orgId),
            SK: token,
            number: carNumber,
            expiresAt,
            // Background hygiene only -- claim() always checks expiresAt
            // explicitly, since DynamoDB's TTL sweep isn't instant.
            TTL:
                Math.floor(expiresAt / 1000) +
                Math.floor(DRIVER_DELEGATION_TOKEN_LIFETIME_MS / 1000),
            byH: requestContext
                .getEntityFactory()
                .getHashFromEmail(context.email),
        };
        const status = await this.ddbUtils.ddbPut(
            record,
            process.env.ElapsedTempDbTable
        );
        if (status !== "OK") {
            return { error: "Unable to create delegation", statusCode: 500 };
        }
        return { status: "ok", token, expiresAt, number: carNumber };
    }

    async claim(json, context) {
        if (!isAuthenticated(context)) {
            return { error: "unauthorized", statusCode: 401 };
        }
        const tokenPk = DRIVER_DELEGATION_TOKEN_PK(context.orgId);
        const record = await this.ddbUtils.ddbQueryPkSk(
            tokenPk,
            json.token,
            process.env.ElapsedTempDbTable
        );
        if (!record) {
            return {
                error: "Token not found or already used",
                statusCode: 410,
            };
        }
        if (Date.now() > record.expiresAt) {
            return { error: "Token expired", statusCode: 410 };
        }
        const consumed = await this.ddbUtils.ddbConsumeSingleUse(
            tokenPk,
            json.token,
            process.env.ElapsedTempDbTable
        );
        if (!consumed) {
            // Lost a race against another claim (or a retry) of the same token.
            return { error: "Token already claimed", statusCode: 409 };
        }
        const carNumber = record.number;
        const participant = await this.ddbUtils.ddbQueryPkSk(
            `${context.orgId}:PTCP`,
            carNumber
        );
        if (!participant) {
            return { error: "Driver not found", statusCode: 404 };
        }
        const hash = requestContext
            .getEntityFactory()
            .getHashFromEmail(context.email);
        const maintainerHashes = Array.from(participant.maintainerHashes || []);
        if (!maintainerHashes.includes(hash)) {
            maintainerHashes.push(hash);
        }
        // Full-record write, same convention as updateWalkup below: no
        // partial-attribute update exists for entity records. Accepted,
        // narrow race: this read-modify-write can lose against another
        // claim or a staff revoke landing on the same driver at the same
        // instant, same as any other field on this record already can.
        await this.ddbUtils.addSingle({
            ...participant,
            PK: ":PTCP",
            orgId: context.orgId,
            maintainerHashes,
        });
        return { status: "ok", number: carNumber };
    }

    async updateWalkup(json, context) {
        if (!isAuthenticated(context)) {
            return { error: "unauthorized", statusCode: 401 };
        }
        const carNumber = json.number != null ? String(json.number) : "";
        if (!carNumber) {
            return { error: "Missing number", statusCode: 400 };
        }
        const participant = await this.ddbUtils.ddbQueryPkSk(
            `${context.orgId}:PTCP`,
            carNumber
        );
        const hash = requestContext
            .getEntityFactory()
            .getHashFromEmail(context.email);
        const maintainerHashes = Array.from(
            participant?.maintainerHashes || []
        );
        if (!participant || !maintainerHashes.includes(hash)) {
            return { error: "unauthorized", statusCode: 401 };
        }
        // Full-record write, matching the existing addParticipant/addSingle
        // convention: there's no partial-attribute update for entity records, so
        // every field the driver already has has to ride along, or PutItem would
        // silently erase it -- name, sponsor, notes, and maintainerHashes itself
        // included. (Narrow, accepted tradeoff: a maintainer write racing a
        // staff revoke on the same driver at the same instant could re-include
        // the just-revoked hash, the same read-modify-write race every other
        // field on this record already has today.)
        return await this.ddbUtils.addSingle({
            ...participant,
            PK: ":PTCP",
            orgId: context.orgId,
            wLink: json.wLink,
        });
    }

    async revokeMaintainer(json, context) {
        const carNumber = json.number != null ? String(json.number) : "";
        if (!carNumber || !json.hash) {
            return { error: "Missing number or hash", statusCode: 400 };
        }
        const participant = await this.ddbUtils.ddbQueryPkSk(
            `${context.orgId}:PTCP`,
            carNumber
        );
        if (!participant) {
            return { error: "Driver not found", statusCode: 404 };
        }
        const maintainerHashes = Array.from(
            participant.maintainerHashes || []
        ).filter((h) => h !== json.hash);
        // Same read-modify-write tradeoff as claim() above: a claim landing
        // on this same driver at the same instant can lose this revoke, or
        // vice versa.
        return await this.ddbUtils.addSingle({
            ...participant,
            PK: ":PTCP",
            orgId: context.orgId,
            maintainerHashes,
        });
    }
}
module.exports = DriverDelegationService;
