const fs = require('fs');
const axios = require("axios");



const CF="https://05wv6js1p4.execute-api.us-east-2.amazonaws.com/test"
//const CF="https://d15zun4udup4ky.cloudfront.net/app"


//time curl  $VERBOSE $CF/addBulk         -XPOST --data @bulk.json        --header "$AUTH"
//time curl   $VERBOSE $CF/getRaceConfig  --header "$AUTH"
const orgId="test."+new Date().getTime();
const getH=`${CF}/getRaceHistory?orgId=${orgId}`
const eventUrl=`${CF}/addEventConfig`
const driverUrl=`${CF}/addParticipant`

const getData = async url => {
  try {
	const token=  fs.readFileSync(__dirname + '/token.txt', 'utf8');
	const AUTH="Authorization: "+ token
    axios.defaults.headers.common['Authorization'] = token;

    const response = await axios.get(url);
    const data = response.data;
    return data;
  } catch (error) {
    console.log(error);
  }
};
const postData = async (url,req) => {
  try {
	const token=  fs.readFileSync(__dirname + '/token.txt', 'utf8');
	const AUTH="Authorization: "+ token
    axios.defaults.headers.common['Authorization'] = token;

  	const response=await              axios.post(url, req);
	console.log(response);
			return response;
  } catch (error) {
    console.log(error);
  }
};

test('postEvent: ', () => {
  return postData(eventUrl,{"orgId":orgId, "lcl1":"true"}).then(received => {
    expect(received.data.status).toMatch(/ok/i);
  });
});
test('postAddParticipant: ', () => {
  return postData(driverUrl,{"orgId":orgId, "number":"333", "name":"Elmer333"}).then(received => {
    expect(received.data.status).toMatch(/ok/i);
  });
});
test('postAddPending: ', () => {
  return postData(`${CF}/addPending`,{"orgId":orgId, "cn":["333","334"] }).then(received => {
    expect(received.data.status).toMatch(/ok/i);
  });
});
test('postAddBlocks: ', () => {
  return postData(`${CF}/addBlocks`,{"orgId":orgId, "cn":["333","334"] }).then(received => {
    expect(received.data.status).toMatch(/ok/i);
  });
});

test('postDdbQuery: ', () => {
  return postData(`${CF}/ddbQuery`,{"orgId":orgId, "cn":["333","800"] }).then(received => {
    expect(received.data.Count).toEqual(1);
  });
});

test('getHistory: the data should by created by 2020vu', () => {
  return getData(getH).then(data => {
    expect(data[0].by).toMatch(/2020vu/i);
  });
});


