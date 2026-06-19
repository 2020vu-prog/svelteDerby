const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

const devConfig = require(path.resolve(
    __dirname,
    process.env.TEST_AWS_EXPORTS_FILE || "./aws-exports.json"
));

test("Cognito token uses hosted client and expected pool", () => {
    const token = fs.readFileSync(path.resolve(__dirname, "token.txt"), "utf8");
    const decoded = jwt.decode(token);

    expect(decoded).toBeTruthy();
    expect(decoded.aud).toBe(devConfig.aws_user_pools_hosted_client_id);
    expect(decoded.iss).toBe(
        `https://cognito-idp.${devConfig.aws_cognito_region}.amazonaws.com/${devConfig.aws_user_pools_id}`
    );
    expect(decoded.token_use).toBe("id");
    expect(decoded["cognito:username"]).toBeTruthy();
});
