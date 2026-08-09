const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
const CognitoUserPool = AmazonCognitoIdentity.CognitoUserPool;
const fs = require('fs');
const path = require('path');
const devConfig = require(path.resolve(__dirname, '..', process.env.TEST_AWS_EXPORTS_FILE || './aws-exports.json'));
//global.fetch = require('node-fetch');

const poolData = {    
	UserPoolId : devConfig.aws_user_pools_id,
	ClientId : devConfig.aws_user_pools_hosted_client_id
}; 
const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
function Login() {
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
Login().catch((err) => {
    console.error(err);
    process.exit(1);
});
