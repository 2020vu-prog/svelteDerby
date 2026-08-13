const { v4: uuidv4 } = require("uuid");

const runId = process.env.DERBY_INTEGRATION_RUN_ID || uuidv4().substring(0, 5);

module.exports = {
    integrationTimestamp:
        process.env.DERBY_INTEGRATION_TIMESTAMP || new Date().toISOString(),
    orgId: `Test.${runId}`,
    orgIz: "Test",
};
