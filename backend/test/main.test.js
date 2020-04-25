const fs = require('fs');
const axios = require("axios");
const { v4: uuidv4 } = require('uuid');
const testers = /2020vu|ConnorM/i

const dloop = [];
for (var x = 701; x < 730; x++) {
    dloop.push([x]);
}

//const CF="https://05wv6js1p4.execute-api.us-east-2.amazonaws.com/test"
const CF = "https://d15zun4udup4ky.cloudfront.net/app"


//time curl  $VERBOSE $CF/addBulk         -XPOST --data @bulk.json        --header "$AUTH"
const orgU = uuidv4().substring(0, 5);
const orgId = "test." + orgU;

function checkTime(i) {
    return (i < 10) ? "0" + i : i;
}

function getHHMMSS(inDate) {
    h = checkTime(inDate.getHours()),
        m = checkTime(inDate.getMinutes()),
        s = checkTime(inDate.getSeconds());
    return (`${h}:${m}:${s}`);
}
const getData = async url => {
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
const postData = async (url, req) => {
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
const orgIz = "test";

test('listOrgConfig: ', () => {
    return getData(`${CF}/listOrgConfig`).then(data => {
        expect(Object.keys(data).length).toBeGreaterThan(0);
    });
});


test('postEvent: ', () => {
    const now = new Date().toISOString()

    return postData(`${CF}/addEventConfig`, { "orgIz": orgIz, "orgId": orgId, "lcl1": "true", "name": `npm Test ${now} ` }).then(received => {
        expect(received.data.status).toMatch(/ok/i);
    });
});

test('getRaceConfig: ', () => {
    return getData(`${CF}/getRaceConfig`).then(data => {
        expect(Object.keys(data).length).toBeGreaterThan(0);
    });
});

test('listChartTypes: ', () => {
    return getData(`${CF}/listChartTypes?orgId=${orgId}&orgIz=${orgIz}`).then(data => {
        expect(Object.keys(data).length).toBeGreaterThan(0);
        console.log("s3listdata: ", data);
    });
});

test('postAddParticipant: ', () => {
    const hhmmss = getHHMMSS(new Date());
    return postData(`${CF}/addParticipant`, { "orgIz": orgIz, "orgId": orgId, "number": "333", "name": `Elmer333 ${hhmmss}` }).then(received => {
        expect(received.data.status).toMatch(/ok/i);
    });
});

//test.each([[778],[ 776], [775]])('postAddParticipantLOOP: ', (carNumber) => {
test.each(dloop)('postAddParticipantLOOP: ', (carNumber) => {
    const hhmmss = getHHMMSS(new Date());
    return postData(`${CF}/addParticipant`, { "orgIz": orgIz, "orgId": orgId, "number": "" + carNumber, "name": `Elmer ${carNumber} ${hhmmss}` }).then(received => {
        expect(received.data.status).toMatch(/ok/i);
    });
});

test('postAddPending should work: ', () => {
    return postData(`${CF}/addPending`, { "orgIz": orgIz, "orgId": orgId, "cn": ["333", "334"] }).then(received => {
        expect(received.data.status).toMatch(/ok/i);
    });
});
test('postAddPending should fail: ', () => {
    return postData(`${CF}/addPending`, { "orgIz": orgIz, "orgId": orgId, "cn": ["333", "334"] }).then(received => {
        expect(received.data.status).toMatch(/error/i);
        expect(received.data.error).toMatch(/Pending2 already exists/i);
    });
});
test('postAddBlocksBackwards: should fail b/c cars in wrong lanes. ', () => {
    return postData(`${CF}/addBlocks`, { "orgIz": orgIz, "orgId": orgId, "cn": ["334", "333"] }).then(received => {
        expect(received.data.status).toMatch(/error/i);
        expect(received.data.error).toEqual("Cars in wrong lane(s)");
    });
});

test('postAddBlocks: ', () => {
    return postData(`${CF}/addBlocks`, { "orgIz": orgIz, "orgId": orgId, "cn": ["333", "334"] }).then(received => {
        expect(received.data.status).toMatch(/ok/i);
    });
});
test('postDuplicateAddBlocks: ', () => {
    return postData(`${CF}/addBlocks`, { "orgIz": orgIz, "orgId": orgId, "cn": ["333", "334"] }).then(received => {
        expect(received.data.status).toMatch(/error/i);
    });
});

test('postApplyFinishTime: should fail because key is invalid!', () => {
    return postData(`${CF}/doApplyFinishTime`, { "orgIz": orgIz, "orgId": orgId, "SK": "foobar:KeyNotPresentOnDb" }).then(received => {
        expect(received.data.status).toMatch(/error/i);
    });
});

test('postDdbQuery: ', () => {
    return postData(`${CF}/ddbQuery`, { "orgIz": orgIz, "orgId": orgId, "cn": ["333", "800"] }).then(received => {
        expect(received.data.Count).toEqual(1);
    });
});

test('getHistory: the data should by created by a real tester', () => {
    return getData(`${CF}/getRaceHistory?orgId=${orgId}&orgIz=${orgIz}`).then(data => {
        expect(data[0].by).toMatch(testers);
    });
});

var timerSkAPhase = "";
var timerSkBPhase = "";

test('getNextOnBlocks: ', () => {
    return getData(`${CF}/getNextOnBlocks?orgId=${orgId}&orgIz=${orgIz}`).then(data => {
        console.log("nextOnBlocks:", data);
        expect(data[0].by).toMatch(testers);
        expect(data.length).toEqual(1);
        timerSkAPhase = data[0].SK;
    });
});

test('applyFinishTime: should succeed', () => {
    console.log("applyFinishTime:", timerSkAPhase);
    return postData(`${CF}/doApplyFinishTime`, { "orgIz": orgIz, "orgId": orgId, SK: timerSkAPhase, phr: [0, 33] }).then(received => {
        expect(received.data.status).toMatch(/ok/i);
    });
});

test('getNextOnBlocks: should be empty after apply finish time', () => {
    return getData(`${CF}/getNextOnBlocks?orgId=${orgId}&orgIz=${orgIz}`).then(data => {
        expect(data.length).toEqual(0);
    });
});

// Still pending until phase2 time applied.
test('postAddPending phase2 should fail : ', () => {
    return postData(`${CF}/addPending`, { "orgIz": orgIz, "orgId": orgId, "cn": ["333", "334"] }).then(received => {
        expect(received.data.status).toMatch(/error/i);
        expect(received.data.error).toMatch(/Pending2 already exists/i);
    });
});
test('postAddBlocksPhase2: should work. ', () => {
    return postData(`${CF}/addBlocks`, { "orgIz": orgIz, "orgId": orgId, "cn": ["334", "333"] }).then(received => {
        expect(received.data.status).toMatch(/ok/i);
    });
});

test('getNextOnBlocks: should be B phase key', () => {
    return getData(`${CF}/getNextOnBlocks?orgId=${orgId}&orgIz=${orgIz}`).then(data => {
        expect(data.length).toEqual(1);
        timerSkBPhase = data[0].SK;
    });
});

test('applyFinishTime: (B Phase) should succeed', () => {
    console.log("applyFinishTime:", timerSkBPhase);
    return postData(`${CF}/doApplyFinishTime`, { "orgIz": orgIz, "orgId": orgId, SK: timerSkBPhase, phr: [44, 0] }).then(received => {
        expect(received.data.status).toMatch(/ok/i);
    });
});

test('getNextOnBlocks: should be empty after apply (B phase) finish time', () => {
    return getData(`${CF}/getNextOnBlocks?orgId=${orgId}&orgIz=${orgIz}`).then(data => {
        expect(data.length).toEqual(0);
    });
});

test('postAddPending should work again: ', () => {
    return postData(`${CF}/addPending`, { "orgIz": orgIz, "orgId": orgId, "cn": ["333", "334"] }).then(received => {
        expect(received.data.status).toMatch(/ok/i);
    });
});


var testChartId = "";
test('postAddChart should work ', () => {
    return postData(`${CF}/addChart`, { "orgIz": orgIz, "orgId": orgId, "bracketName": "npmTest", "imgPath": "imgPathTODO", "jsonPath": "jsonPathTodo" }).then(received => {
        expect(received.data.status).toMatch(/ok/i);
        testChartId = received.data.chartId;
        expect(testChartId.length).toBeGreaterThan(0);
    });
});

test('postAddChartPosition should work ', () => {
    return postData(`${CF}/addChartPosition`,
        {
            "orgIz": orgIz,
            "orgId": orgId,
            "chartId": testChartId,
            // "heatPositionList": [{ "id": "A", "ptcp": "100" }],
            "pos": [{ "id": "A", "ptcp": "100" }],
            "heatNumber": "01"
        }
    ).then(received => {
        expect(received.data.status).toMatch(/ok/i);
    });
});
