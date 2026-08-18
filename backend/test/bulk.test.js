const { CF, getData, postData } = require("./common.js");
console.log("start:", CF);
const data = [
    {
        PK: "chi:PTCP",
        orgId: "chi",
        SK: "100",
        bar: "none",
        name: "Chris",
        number: 100,
        by: "IT",
        at: 123,
    },
    {
        PK: "chi:PTCP",
        orgId: "chi",
        SK: "101",
        bar: "none",
        name: "Chris",
        number: 101,
        by: "IT",
        at: 123,
    },
    {
        PK: "chi:PTCP",
        orgId: "chi",
        SK: "102",
        bar: "none",
        name: "Chris",
        number: 102,
        by: "IT",
        at: 123,
    },
    {
        PK: "chi:RS",
        orgId: "chi",
        SK: "uuu1",
        carNumbers: [101, 102],
        by: "IT2",
        name: "IgnoreMe",
        ph1: [0, 12],
        ph2: [123, 0],
    },
    {
        PK: "chi:RP",
        orgId: "chi",
        SK: "uuu2",
        carNumbers: [101, 102],
        by: "IT2",
        name: "IgnoreMe",
        phr: [0, 12],
    },
];

test("listOrgConfig: ", () => {
    return getData(`${CF}/listOrgConfig`).then((data) => {
        expect(Object.keys(data).length).toBeGreaterThan(0);
    });
});
