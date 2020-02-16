const entityFactories = {};
const cHelper=(pthis,props,optionalMembers)=>{
    //console.log (pthis.constructor.members) ;

    const members=optionalMembers?optionalMembers:pthis.constructor.members;
    for (let [key, value] of Object.entries(props)) {
        //console.log("Chelper checking:"+key);

        if (members.includes(key)) {
            //console.log("Chelper applying:"+key);
            pthis[key] = value;
        }
    }
}
class EntityBase{
    static EntityBaseMembers = ["PK", "SK", "at", "by", "orgID"];

    constructor(props){
        cHelper(this,props,this.constructor.EntityBaseMembers);
    }
    get primaryKey() {
        return this.PK;
      }
}
entityFactories['RaceStanding'] = class RaceStanding  extends EntityBase{
    static members = [ "name", "carNumbers"];

    static canBuild(json) {
        return (json.PK && json.PK.endsWith(":RS"));
    }
    constructor(props) {
        super(props);

        cHelper(this,props);
    }
};
entityFactories['Participant'] = class Participant extends EntityBase{
    static members = [ "name", "number"];
    static canBuild(json) {
        return (json.PK && json.PK.endsWith(":PTCP"));
    }
    constructor(props) {
        super(props);
        cHelper(this,props);
    }
    get lastUpdate() {
        return this.at;
      }
};

class EntityFactory {
    constructor() { }
    build(json) {
        const candidates = Object.values(entityFactories).filter(function (factory) {
            return (factory.canBuild(json));
        }).map(function (factory) {
            return new factory(json);
        });
        return candidates[0];
    }
};
const ef = new EntityFactory();
const foo=ef.build({ PK: "foo:PTCP", SK:"sksk", bar: "none", number: 100 ,by:"IT",at:123});
console.log(foo);
console.log("back to json:"+JSON.stringify(foo));
console.log("primaryKey:"+ foo.primaryKey);
console.log(foo.lastUpdate);
const rs=ef.build({ PK: "foo:RS", SK:"uuu",carNumbers: [101, 102], by:"IT2" });
console.log(rs);
console.log("primaryKey:"+ rs.primaryKey);

