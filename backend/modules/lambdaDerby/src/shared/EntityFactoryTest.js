const EntityFactory=require( './EntityFactory.js')
const ef = new EntityFactory();
for(var i=0;i<10000;i++){
const foo=ef.build({ PK: "foo:PTCP", SK:"sksk", bar: "none", name: "Chris",number: 100 ,by:"IT",at:123});
const rs=ef.build({ PK: "foo:RS", SK:"uuu",carNumbers: [101, 102], by:"IT2" ,name:"IgnoreMe",ph1:[0,12],ph2:[123,0]});

}
const foo=ef.build({ PK: "foo:PTCP", SK:"sksk", bar: "none", name: "Chris",number: 100 ,by:"IT",at:123});
const rs=ef.build({ PK: "foo:RS", SK:"uuu",carNumbers: [101, 102], by:"IT2" ,name:"IgnoreMe",ph1:[0,12],ph2:[123,0]});
const rp=ef.build({ PK: "foo:RP", SK:"uuu",carNumbers: [101, 102], by:"IT2" ,name:"IgnoreMe",phr:[0,12]});

console.log(foo);
console.log("back to json:"+JSON.stringify(foo));
console.log("partitionKey:"+ foo.partitionKey);
console.log(foo.lastUpdate);

console.log(rs);
console.log("partitionKey:"+ rs.partitionKey);
console.log("results:"+ rs.overallResults);

console.log(rp);
console.log(ef.build({}));
