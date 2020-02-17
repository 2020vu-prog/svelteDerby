const entityFactories = {};
const cHelper = (pthis, props, optionalMembers) => {
    //console.log (pthis.constructor.members) ;

    const members = optionalMembers ? optionalMembers : pthis.constructor.members;
    for (let [key, value] of Object.entries(props)) {
        //console.log("Chelper checking:"+key);

        if (members.includes(key)) {
            //console.log("Chelper applying:"+key);
            pthis[key] = value;
        }
    }
}

class EntityBase {
    static EntityBaseMembers = ["PK", "SK", "at", "by", "orgID"];

    constructor(props) {
        cHelper(this, props, this.constructor.EntityBaseMembers);
    }
    get partitionKey() {
        return this.PK;
    }
    get sortKey() {
        return this.PK;
    }
    get lastUpdate() {
        return this.at;
    }
}
entityFactories['RacePhase'] = class RacePhase extends EntityBase {
    static members = ["carNumbers", "phr","rs"];
    static canBuild(json) {
        return (json.PK && json.PK.endsWith(":RP"));
    }
    constructor(props) {
        super(props);
        cHelper(this, props);
    }
}
entityFactories['RaceStanding'] = class RaceStanding extends EntityBase {
    static members = ["carNumbers", "ph1", "ph2"];

    static canBuild(json) {
        return (json.PK && json.PK.endsWith(":RS"));
    }
    constructor(props) {
        super(props);
        cHelper(this, props);
    }
    get phase1Results() {
        return this.ph1;
    }
    get phase2Results() {
        return this.ph2;
    }
    get overallResults() {
        const rc = [];
        if (this.carNumbers && this.phase1Results && this.phase2Results) {
            for (var i = 0; i < this.carNumbers.length; i++) {
                rc[i] = this.phase1Results[i] + this.phase2Results[i];
            }
        }
        return rc;
    }
}
entityFactories['Participant'] = class Participant extends EntityBase {
    static members = ["name", "number"];
    static canBuild(json) {
        return (json.PK && json.PK.endsWith(":PTCP"));
    }
    constructor(props) {
        super(props);
        cHelper(this, props);
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
        
        return candidates.length>0?candidates[0]:null;
    }
};

module.exports = EntityFactory;

