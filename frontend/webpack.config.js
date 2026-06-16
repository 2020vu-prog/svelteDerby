const createConfig = require("./webpack.config.common");

const cloudfrontTargets = {
    derbyTest: "https://dd5oqqc7cmn2u.cloudfront.net",
    derbyStage: "https://d6drm73u6o8en.cloudfront.net",
    "go-derby-prod": "https://d15sd7dor6oox4.cloudfront.net",
};

const deployEnvironment = process.env.TF_VAR_DeployEnvironment || "derbyTest";
const cloudfrontTarget =
    process.env.DERBY_CLOUDFRONT || cloudfrontTargets[deployEnvironment];

if (!cloudfrontTarget) {
    throw new Error(
        `No CloudFront target configured for TF_VAR_DeployEnvironment=${deployEnvironment}`
    );
}

module.exports = createConfig(cloudfrontTarget);
