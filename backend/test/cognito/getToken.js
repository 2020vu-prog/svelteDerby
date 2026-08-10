const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
const CognitoUserPool = AmazonCognitoIdentity.CognitoUserPool;
const fs = require('fs');
const path = require('path');
const { getAwsConfig } = require('../deploymentConfig.js');
//global.fetch = require('node-fetch');

function Login(devConfig) {
    const userPool = new AmazonCognitoIdentity.CognitoUserPool({
        UserPoolId: devConfig.aws_user_pools_id,
        ClientId: devConfig.aws_user_pools_hosted_client_id,
    });
    return new Promise((resolve, reject) => {
    var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({
        Username : process.env.TEST_USER,
        Password : process.env.TEST_PASSWORD,
    });

    var userData = {
        Username : process.env.TEST_USER,
        Pool : userPool
    };
    var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function (result) {
            fs.writeFileSync(path.resolve(__dirname, '..', 'token.txt'),  result.getIdToken().getJwtToken())
            console.log('Cognito login succeeded.');
            resolve();

        },
        onFailure: function(err) {
            reject(err);
        },

    });
    });
}
getAwsConfig().then(Login).catch((err) => {
    console.error(err);
    process.exit(1);
});
