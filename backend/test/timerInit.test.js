const { CfBase, getData, postData, getHHMMSS } = require("./common.js");
const { v4: uuidv4 } = require("uuid");

test("initTimer: ", async () => {
    const data = await getData(`${CfBase}/timer/getUuid?mac=mac`);

    console.log("initTimer: ", {
        uuid: data.uuid,
        publicKeyPresent: Boolean(data.publicKey),
        privateKeyPresent: Boolean(data.privateKey),
    });
    expect(data.uuid.length).toBeGreaterThan(0);
    expect(data.uuid.length).toEqual(36);
});
