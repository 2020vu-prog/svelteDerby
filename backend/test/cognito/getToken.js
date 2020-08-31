const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
const CognitoUserPool = AmazonCognitoIdentity.CognitoUserPool;
const AWS = require('aws-sdk');
const request = require('request');
const jwkToPem = require('jwk-to-pem');
const jwt = require('jsonwebtoken');
const fs = require('fs');
global.fetch = require('node-fetch');

const poolData = {    
UserPoolId : "us-east-2_iksOg1OJe",
ClientId : "5u75gsnn9883r7pnpnm894c2tg" // Your client id here
}; 
const pool_region = 'us-east-2';

const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
function Login() {
    var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({
        Username : process.env.TEST_USER,
        Password : process.env.TEST_PASSWORD,
    });

    var userData = {
        Username : 'clc4',
        Pool : userPool
    };
    var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function (result) {
            console.log('access token + ' + result.getAccessToken().getJwtToken());
            console.log('id token + ' + result.getIdToken().getJwtToken());
            console.log('refresh token + ' + result.getRefreshToken().getToken());
		fs.writeFileSync( 'token.txt',  result.getIdToken().getJwtToken())

        },
        onFailure: function(err) {
            console.log(err);
        },

    });
}
Login();
