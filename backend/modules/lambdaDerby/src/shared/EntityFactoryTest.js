const EntityFactory = require("./EntityFactory.js");
const propOverrides = {
    orgId: "chi",
    by: "whoDunnIt",
};
const ef = new EntityFactory(propOverrides);
for (var i = 0; i < 10000; i++) {
    const foo = ef.build({
        PK: "foo:PTCP",
        bar: "none",
        name: "Chris",
        number: 100,
        by: "IT",
        at: 123,
    });
    const rs = ef.build({
        PK: "foo:RS",
        cn: [101, 102],
        by: "IT2",
        name: "IgnoreMe",
        ph1: [0, 12],
        ph2: [123, 0],
    });
}
const foo = ef.build({
    PK: "foo:PTCP",
    bar: "none",
    name: "Chris",
    number: 100,
    by: "IT",
    at: 123,
});
const rs = ef.build({
    PK: "foo:RS",
    cn: [101, 102],
    by: "IT2",
    name: "IgnoreMe",
    ph1: [0, 12],
    ph2: [123, 0],
});
const rp = ef.build({
    PK: "foo:RP",
    cn: [101, 102],
    by: "IT2",
    name: "IgnoreMe",
    phr: [0, 12],
});
const ecRaw = { PK: "EventConfig", lcl1: true, TTL: 5 };

console.log(foo);
foo.preWrite();
console.log(foo);

console.log("back to json:" + JSON.stringify(foo));
console.log("partitionKey:" + foo.partitionKey);
console.log("PK:" + foo.PK);
console.log(foo.lastUpdate);

console.log(rs);
console.log("partitionKey:" + rs.partitionKey);
console.log("results:" + rs.overallResults);
console.log("PK:" + rs.PK);

console.log(rp);
console.log(ef.build({}));
console.log("EventConfig: ", ef.build(ecRaw));
