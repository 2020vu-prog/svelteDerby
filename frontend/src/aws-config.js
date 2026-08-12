const awsConfig = window.aws_exports;

if (!awsConfig) {
    throw new Error("Missing /aws-exports.js deployment configuration");
}

export default awsConfig;
