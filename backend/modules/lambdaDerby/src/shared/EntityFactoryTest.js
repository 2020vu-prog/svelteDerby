const EntityFactory = require("./EntityFactory.js");
const log = require("loglevel");
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

log.debug(foo);
foo.preWrite();
log.debug(foo);

log.debug("back to json:" + JSON.stringify(foo));
log.debug("partitionKey:" + foo.partitionKey);
log.debug("PK:" + foo.PK);
log.debug(foo.lastUpdate);

log.debug(rs);
log.debug("partitionKey:" + rs.partitionKey);
log.debug("results:" + rs.overallResults);
log.debug("PK:" + rs.PK);

log.debug(rp);
log.debug(ef.build({}));
log.debug("EventConfig: ", ef.build(ecRaw));
