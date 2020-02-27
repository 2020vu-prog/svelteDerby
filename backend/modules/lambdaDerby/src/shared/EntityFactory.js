const entityFactories = {};
const RacePhaseEid = ":RP";
const RaceStandingEid = ":RS";
const ParticipantEid = ":PTCP";
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
    static EntityBaseMembers = ["PK", "SK", "at", "by", "orgId", "TTL"];

    constructor(props) {
        cHelper(this, props, this.constructor.EntityBaseMembers);
    }

    preWrite() {
        this.at = new Date().getTime();
    }

    get partitionKey() {
        return this.PK;
    }
    get sortKey() {
        return this.SK;
    }
    get lastUpdate() {
        return this.at;
    }

}
const EventConfigLit='EventConfig';
entityFactories[EventConfigLit] = class EventConfig extends EntityBase {
    static members = ["lcl1"]; // lowCarlane1
    static canBuild(json) {
        return (json.PK && json.PK===EventConfigLit);
    }
    constructor(props) {
        super(props);
        cHelper(this, props);
    }
    preWrite() {
        super.preWrite();
        this.PK =  EventConfigLit;

        this.SK = this.orgId;
    }

}

entityFactories['RacePhase'] = class RacePhase extends EntityBase {
    static members = ["cn", "phr", "rs"];
    static canBuild(json) {
        return (json.PK && json.PK.endsWith(RacePhaseEid));
    }
    constructor(props) {
        super(props);
        cHelper(this, props);
    }
    preWrite() {
        super.preWrite();
        this.PK = this.orgId + RacePhaseEid;

        this.SK = new Date().getTime() + "";
    }
    get carNumbers() {
        return this.cn;
    }
}
entityFactories['RaceStanding'] = class RaceStanding extends EntityBase {
    static members = ["cn", "ph1", "ph2"];
    static eid = ":RS";
    static canBuild(json) {
        return (json.PK && json.PK.endsWith(RaceStandingEid));
    }
    constructor(props) {
        super(props);
        cHelper(this, props);
    }
    preWrite() {
        super.preWrite();
        this.PK = this.orgId + RaceStandingEid;
        if (!this.SK)
            this.SK = new Date().getTime() + "";
    }
    get phase1Results() {
        return this.ph1;
    }
    get phase2Results() {
        return this.ph2;
    }
    get carNumbers() {
        return this.cn;
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
    static eid = ":PTCP";
    static canBuild(json) {
        return (json.PK && json.PK.endsWith(ParticipantEid));
    }
    constructor(props) {
        super(props);
        cHelper(this, props);
    }
    preWrite() {
        super.preWrite();
        this.PK = this.orgId + ParticipantEid;
        this.SK = this.number + "";
    }
};


class EntityFactory {
    propOverrides = {}
    constructor(propOverrides) {
        this.propOverrides = propOverrides;
    }
    build(json) {
        for (const [overrideKey, value] of Object.entries(this.propOverrides)) {
            json[overrideKey] = value;

        }
        const candidates = Object.values(entityFactories).filter(function (factory) {
            return (factory.canBuild(json));
        }).map(function (factory) {

            return new factory(json);
        });

        return candidates.length > 0 ? candidates[0] : null;
    }

};

module.exports = EntityFactory;

