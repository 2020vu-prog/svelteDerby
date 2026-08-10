const axios = require("axios");

function getDeploymentBaseUrl() {
    const baseUrl = process.env.DERBY_CLOUDFRONT;
    if (!baseUrl) {
        throw new Error("Missing DERBY_CLOUDFRONT");
    }
    return baseUrl.replace(/\/$/, "");
}

async function getAwsConfig() {
    const response = await axios.get(
        `${getDeploymentBaseUrl()}/app/getAwsConfig`
    );
    return response.data;
}

module.exports = {
    getAwsConfig,
    getDeploymentBaseUrl,
};
