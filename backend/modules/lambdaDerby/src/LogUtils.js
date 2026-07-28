// @ts-check

/**
 * @typedef {Object} LogMessagePayload
 * @property {string} [orgId]
 * @property {string} message
 * @property {string} [level]
 * @property {string} [source]
 * @property {*} [detail]
 */

class LogUtils {
    ddbUtils = null;

    /**
     * @param {import("./shared/DdbUtils.js")} ddbUtils
     */
    constructor(ddbUtils) {
        this.ddbUtils = ddbUtils;
    }

    /**
     * Persist a LogMessage entity using the provided EntityFactory or the
     * request-scoped EntityFactory retained by DdbUtils.
     *
     * @param {string|LogMessagePayload} logMessage
     * @param {import("./shared/EntityFactory.js")} [entityFactory] Optional EntityFactory override.
     * @returns {Promise<Object>}
     */
    async persistLogMessage(logMessage, entityFactory) {
        const logMessagePayload =
            typeof logMessage === "string"
                ? { message: logMessage }
                : { ...logMessage };
        const entityFactoryContext = entityFactory || this.ddbUtils.entityFactory;
        const orgId =
            logMessagePayload.orgId || entityFactoryContext?.propOverrides.orgId;

        if (!orgId) {
            return { error: "missing orgId" };
        }
        if (!logMessagePayload.message) {
            return { error: "missing message" };
        }

        return this.ddbUtils.addSingle(
            {
                ...logMessagePayload,
                PK: ":LogMessage",
                orgId,
            },
            entityFactory
        );
    }
}

module.exports = LogUtils;
