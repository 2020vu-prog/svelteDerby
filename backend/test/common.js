module.exports.FOO = "bar";

const fs = require('fs');
const path = require('path');
const axios = require("axios")
//const devEnv= require("../../frontend/generatedTargets.json")
const devEnv= require(path.resolve(__dirname, process.env.TEST_AWS_EXPORTS_FILE || "./aws-exports.json"))
module.exports.CF = `${devEnv.DERBY_CLOUDFRONT}/app`
module.exports.CfBase = `${devEnv.DERBY_CLOUDFRONT}`

function checkTime(i) {
    return (i < 10) ? "0" + i : i;
}

module.exports.getHHMMSS = (inDate) => {
    h = checkTime(inDate.getHours()),
        m = checkTime(inDate.getMinutes()),
        s = checkTime(inDate.getSeconds());
    return (`${h}:${m}:${s}`);
}
function buildRequestError(error) {
    if (error.response) {
        const detail = {
            method: error.config && error.config.method,
            url: error.config && error.config.url,
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
        };
        const requestError = new Error(`Request failed: ${JSON.stringify(detail)}`);
        requestError.detail = detail;
        return requestError;
    }
    const detail = {
        code: error.code,
        message: error.message,
    };
    const requestError = new Error(`Request failed: ${JSON.stringify(detail)}`);
    requestError.detail = detail;
    return requestError;
}
module.exports.getData = async (url, config = {}) => {
    try {
        const token = fs.readFileSync(__dirname + '/token.txt', 'utf8');
        axios.defaults.headers.common['Authorization'] = token;

        const response = await axios.get(url, config);
        const data = response.data;
        return data;
    } catch (error) {
        throw buildRequestError(error);
    }
};
module.exports.postData = async (url, req) => {
    try {
        const token = fs.readFileSync(__dirname + '/token.txt', 'utf8');
        axios.defaults.headers.common['Authorization'] = token;

        const response = await axios.post(url, req);
        //console.log(response);
        return response;
    } catch (error) {
        throw buildRequestError(error);
    }
};
