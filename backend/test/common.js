module.exports.FOO = "bar";
module.exports.CF = "https://d15zun4udup4ky.cloudfront.net/app"
//const CF="https://05wv6js1p4.execute-api.us-east-2.amazonaws.com/test"

const fs = require('fs');
const axios = require("axios")

function checkTime(i) {
    return (i < 10) ? "0" + i : i;
}

module.exports.getHHMMSS = (inDate) => {
    h = checkTime(inDate.getHours()),
        m = checkTime(inDate.getMinutes()),
        s = checkTime(inDate.getSeconds());
    return (`${h}:${m}:${s}`);
}
module.exports.getData = async url => {
    try {
        const token = fs.readFileSync(__dirname + '/token.txt', 'utf8');
        const AUTH = "Authorization: " + token
        axios.defaults.headers.common['Authorization'] = token;

        const response = await axios.get(url);
        const data = response.data;
        return data;
    } catch (error) {
        console.log(error);
    }
};
module.exports.postData = async (url, req) => {
    try {
        const token = fs.readFileSync(__dirname + '/token.txt', 'utf8');
        const AUTH = "Authorization: " + token
        axios.defaults.headers.common['Authorization'] = token;

        const response = await axios.post(url, req);
        //console.log(response);
        return response;
    } catch (error) {
        console.log(error);
    }
};
