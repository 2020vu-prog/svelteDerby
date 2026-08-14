const { CF, getData, postData, getHHMMSS } = require("./common.js");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const EntityFactory = require(
    "../modules/lambdaDerby/src/shared/EntityFactory.js"
);
const { orgId, orgIz } = require("./integrationRun.js");
const token = fs.readFileSync(path.resolve(__dirname, "token.txt"), "utf8");
const testerEmail = jwt.decode(token).email;
const testerEmailHash = new EntityFactory({}).getHashFromEmail(
    testerEmail
);

const slowDrivers = false;
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForRaceHistory(predicate, attempts = 10) {
    for (let attempt = 0; attempt < attempts; attempt++) {
        const data = await getData(
            `${CF}/getRaceHistory?orgId=${orgId}&orgIz=${orgIz}&cache=${uuidv4()}`
        );
        const matchingRace = data.find(predicate);
        if (matchingRace) {
            return matchingRace;
        }
        await sleep(500);
    }
    return undefined;
}

const dmax = slowDrivers ? 800 : 520;

const dloop = [];
for (var x = 501; x < dmax; x++) {
    dloop.push([x]);
}

test("listOrgConfig: ", () => {
    return getData(`${CF}/listOrgConfig`).then((data) => {
        expect(Object.keys(data).length).toBeGreaterThan(0);
    });
});

test("postEvent: ", () => {
    const now = new Date().toISOString();

    return postData(`${CF}/addEventConfig`, {
        orgIz: orgIz,
        orgId: orgId,
        lcl1: "true",
        name: `npm Test ${now} `,
    }).then((received) => {
        expect(received.data.status).toMatch(/ok/i);
    });
});

/*
test("getRaceConfig: ", () => {
    return getData(`${CF}/getRaceConfig`).then((data) => {
        expect(Object.keys(data).length).toBeGreaterThan(0);
    });
});
*/

test("listChartTypes: ", () => {
    return getData(`${CF}/listChartTypes?orgId=${orgId}&orgIz=${orgIz}`).then(
        (data) => {
            expect(Object.keys(data).length).toBeGreaterThan(0);
            //console.log("s3listdata: ", data);
        }
    );
});

test("postAddParticipant: ", () => {
    const hhmmss = getHHMMSS(new Date());
    return postData(`${CF}/addParticipant`, {
        orgIz: orgIz,
        orgId: orgId,
        number: "333",
        name: `Elmer333 ${hhmmss}`,
    }).then((received) => {
        expect(received.data.status).toMatch(/ok/i);
    });
});

//test.each([[778],[ 776], [775]])('postAddParticipantLOOP: ', (carNumber) => {
test.each(dloop)("postAddParticipantLOOP: ", async (carNumber) => {
    if (slowDrivers) {
        await sleep(2000);
    }
    const hhmmss = getHHMMSS(new Date());
    const received = await postData(`${CF}/addParticipant`, {
        orgIz: orgIz,
        orgId: orgId,
        number: "" + carNumber,
        name: `Elmer ${carNumber} ${hhmmss}`,
    });
    expect(received.data.status).toMatch(/ok/i);
});

test("postAddPending should work: ", () => {
    return postData(`${CF}/addPending`, {
        orgIz: orgIz,
        orgId: orgId,
        cn: ["333", "334"],
    }).then((received) => {
        expect(received.data.status).toMatch(/ok/i);
    });
});
test("postAddPending should fail: ", () => {
    return postData(`${CF}/addPending`, {
        orgIz: orgIz,
        orgId: orgId,
        cn: ["333", "334"],
    }).then((received) => {
        expect(received.data.status).toMatch(/error/i);
        expect(received.data.error).toMatch(/Pending already exists/i);
    });
});
test("postAddBlocksBackwards: should fail b/c cars in wrong lanes. ", () => {
    return postData(`${CF}/addBlocks`, {
        orgIz: orgIz,
        orgId: orgId,
        pt: "R",
        cn: ["334", "333"],
    }).then((received) => {
        expect(received.data.status).toMatch(/error/i);
        expect(received.data.error).toEqual("Cars in wrong lane(s)");
    });
});

test("postAddBlocks: ", () => {
    return postData(`${CF}/addBlocks`, {
        orgIz: orgIz,
        orgId: orgId,
        pt: "R",
        cn: ["333", "334"],
    }).then((received) => {
        expect(received.data.status).toMatch(/ok/i);
    });
});
test("postDuplicateAddBlocks: ", () => {
    return postData(`${CF}/addBlocks`, {
        orgIz: orgIz,
        orgId: orgId,
        pt: "R",
        cn: ["333", "334"],
    }).then((received) => {
        expect(received.data.status).toMatch(/error/i);
    });
});

test("postApplyFinishTime: should fail because key is invalid!", () => {
    return postData(`${CF}/doApplyFinishTime`, {
        orgIz: orgIz,
        orgId: orgId,
        SK: "foobar:KeyNotPresentOnDb",
    }).then((received) => {
        expect(received.data.status).toMatch(/error/i);
    });
});

test("postDdbQuery: ", () => {
    return postData(`${CF}/ddbQuery`, {
        orgIz: orgIz,
        orgId: orgId,
        cn: ["333", "800"],
    }).then((received) => {
        expect(received.data.Count).toEqual(1);
    });
});

test("getHistory: the data should be attributed to the tester", () => {
    return getData(`${CF}/getRaceHistory?orgId=${orgId}&orgIz=${orgIz}`).then(
        (data) => {
            expect(data[0].byH).toBe(testerEmailHash);
            expect(data[0].by).toBeUndefined();
        }
    );
});

var timerSkAPhase = "";
var timerSkBPhase = "";

test("getNextOnBlocks: ", () => {
    return getData(`${CF}/getNextOnBlocks?orgId=${orgId}&orgIz=${orgIz}`).then(
        (data) => {
            //console.log("nextOnBlocks:", data);
            expect(data.length).toEqual(1);
            timerSkAPhase = data[0].SK;
            expect(timerSkAPhase).toBeTruthy();
            expect(data[0].byH).toBe(testerEmailHash);
            expect(data[0].by).toBeUndefined();
        }
    );
});

test("applyFinishTime: should succeed", () => {
    //console.log("applyFinishTime:", timerSkAPhase);
    return postData(`${CF}/doApplyFinishTime`, {
        orgIz: orgIz,
        orgId: orgId,
        SK: timerSkAPhase,
        phr: [0, 33000],
    }).then((received) => {
        expect(received.data.status).toMatch(/ok/i);
    });
});

test("getNextOnBlocks: should be empty after apply finish time", () => {
    return getData(`${CF}/getNextOnBlocks?orgId=${orgId}&orgIz=${orgIz}`).then(
        (data) => {
            expect(data.length).toEqual(0);
        }
    );
});

// Still pending until phase2 time applied.
test("postAddPending phase2 should fail : ", () => {
    return postData(`${CF}/addPending`, {
        orgIz: orgIz,
        orgId: orgId,
        cn: ["333", "334"],
    }).then((received) => {
        expect(received.data.status).toMatch(/error/i);
        expect(received.data.error).toMatch(/Pending already exists/i);
    });
});
test("postAddBlocksPhase2: should work. ", () => {
    return postData(`${CF}/addBlocks`, {
        orgIz: orgIz,
        orgId: orgId,
        pt: "R",
        cn: ["334", "333"],
    }).then((received) => {
        expect(received.data.status).toMatch(/ok/i);
    });
});

test("getNextOnBlocks: should be B phase key", () => {
    return getData(`${CF}/getNextOnBlocks?orgId=${orgId}&orgIz=${orgIz}`).then(
        (data) => {
            expect(data.length).toEqual(1);
            timerSkBPhase = data[0].SK;
        }
    );
});

test("applyFinishTime: (B Phase) should succeed", () => {
    //console.log("applyFinishTime:", timerSkBPhase);
    return postData(`${CF}/doApplyFinishTime`, {
        orgIz: orgIz,
        orgId: orgId,
        SK: timerSkBPhase,
        phr: [44000, 0],
    }).then((received) => {
        expect(received.data.status).toMatch(/ok/i);
    });
});

test("getNextOnBlocks: should be empty after apply (B phase) finish time", () => {
    return getData(`${CF}/getNextOnBlocks?orgId=${orgId}&orgIz=${orgIz}`).then(
        (data) => {
            expect(data.length).toEqual(0);
        }
    );
});

test("postAddPending should work again3333333: ", () => {
    return postData(`${CF}/addPending`, {
        orgIz: orgIz,
        orgId: orgId,
        cn: ["333", "334"],
    }).then((received) => {
        expect(received.data.status).toMatch(/ok/i);
    });
});

var testChartId = "";
test("postAddChart should work ", () => {
    return postData(`${CF}/addChart`, {
        orgIz: orgIz,
        orgId: orgId,
        bracketName: "npmTest",
        imgPath: "AASBD/Single/06single.png",
        jsonPath: "AASBD/Single/06single.combined.json",
    }).then((received) => {
        expect(received.data.status).toMatch(/ok/i);
        testChartId = received.data.chartId;
        expect(testChartId.length).toBeGreaterThan(0);
    });
});

test("postAddChartPosition should work ", () => {
    return postData(`${CF}/addChartPosition`, {
        orgIz: orgIz,
        orgId: orgId,
        chartId: testChartId,
        pos: { A: { ptcp: "100", status: "ptcp" } },
        heatNumber: "01",
    }).then((received) => {
        expect(received.data.status).toMatch(/ok/i);
    });
});
test("postAddChartPosition should work ", () => {
    return postData(`${CF}/addChartPosition`, {
        orgIz: orgIz,
        orgId: orgId,
        chartId: testChartId,
        pos: { B: { ptcp: "109", status: "ptcp" } },
        heatNumber: "01",
    }).then((received) => {
        expect(received.data.status).toMatch(/ok/i);
    });
});

test("chart heat 1 creates pending race for cars 100 and 109", async () => {
    const heatKey = `${testChartId}:01`;
    const pendingRace = await waitForRaceHistory(
        (race) => race.SK === heatKey && race.Bp === heatKey
    );

    expect(pendingRace).toBeDefined();
    expect(pendingRace.cn).toEqual(["100", "109"]);
    expect(pendingRace.ph1).toBeUndefined();
    expect(pendingRace.ph2).toBeUndefined();
});

test("completes both phases of chart heat 1", async () => {
    const heat1Key = `${testChartId}:01`;

    const phaseA = await postData(`${CF}/addBlocks`, {
        orgIz,
        orgId,
        pt: "R",
        cn: ["100", "109"],
    });
    expect(phaseA.data.status).toMatch(/ok/i);

    const phaseAOnBlocks = await getData(
        `${CF}/getNextOnBlocks?orgId=${orgId}&orgIz=${orgIz}`
    );
    expect(phaseAOnBlocks).toHaveLength(1);
    expect(phaseAOnBlocks[0].Bp).toBe(heat1Key);

    const phaseAResult = await postData(`${CF}/doApplyFinishTime`, {
        orgIz,
        orgId,
        SK: phaseAOnBlocks[0].SK,
        phr: [0, 33000],
    });
    expect(phaseAResult.data.status).toMatch(/ok/i);

    const phaseB = await postData(`${CF}/addBlocks`, {
        orgIz,
        orgId,
        pt: "R",
        cn: ["109", "100"],
    });
    expect(phaseB.data.status).toMatch(/ok/i);

    const phaseBOnBlocks = await getData(
        `${CF}/getNextOnBlocks?orgId=${orgId}&orgIz=${orgIz}`
    );
    expect(phaseBOnBlocks).toHaveLength(1);
    expect(phaseBOnBlocks[0].Bp).toBe(heat1Key);

    const phaseBResult = await postData(`${CF}/doApplyFinishTime`, {
        orgIz,
        orgId,
        SK: phaseBOnBlocks[0].SK,
        phr: [44000, 0],
    });
    expect(phaseBResult.data.status).toMatch(/ok/i);

    const completedRace = await waitForRaceHistory(
        (race) => race.SK === heat1Key && race.ph1 && race.ph2
    );
    expect(completedRace).toBeDefined();

});

test.skip("startDiscordBot: skipped until manageDiscord is stable in integration", async () => {
    const data = await getData(`${CF}/manageDiscord?orgId=${orgId}&orgIz=${orgIz}`)
    expect(Object.keys(data).length).toBeGreaterThan(0);
});
