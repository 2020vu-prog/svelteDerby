const entityFactories = {};
const RacePhaseEid=":RP";
const RaceStandingEid=":RS";
const ParticipantEid=":PTCP";
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
    static EntityBaseMembers = ["PK", "SK", "at", "by", "orgId"];

    constructor(props) {
        cHelper(this, props, this.constructor.EntityBaseMembers);
    }

    preWrite(){
        this.ttl=getTtl(this.orgId);
        this.at=new Date().toISOString();

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
        return (json.PK && json.PK.endsWith(RacePhaseEid));
    }
    constructor(props) {
        super(props);
        cHelper(this, props);
    }
    preWrite(){
        super.preWrite();
        this.PK=this.orgId+ RacePhaseEid;

        this.SK=new Date().getTime() +"";
    }
}
entityFactories['RaceStanding'] = class RaceStanding extends EntityBase {
    static members = ["carNumbers", "ph1", "ph2"];
    static eid=":RS";
    static canBuild(json) {
        return (json.PK && json.PK.endsWith(RaceStandingEid));
    }
    constructor(props) {
        super(props);
        cHelper(this, props);
    }
    preWrite(){
        super.preWrite();
        this.PK=this.orgId+ RaceStandingEid;

        this.SK=new Date().getTime() +"";
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
    static eid=":PTCP";
    static canBuild(json) {
        return (json.PK && json.PK.endsWith(ParticipantEid));
    }
    constructor(props) {
        super(props);
        cHelper(this, props);
    }
    preWrite(){
        super.preWrite();
        this.PK=this.orgId+ ParticipantEid;
        this.SK=this.number+"";
    }
};
const getTtl = (orgId) => {
    //const config = getConfig(orgId);
    ttlIncrement=1800;
    return Math.round((new Date().getTime() / 1000) + ttlIncrement);
}
const defaultOrgId="chi";
const defaultBy="whoDunnIt";
class EntityFactory {
    constructor() { }
    build(json) {
        const candidates = Object.values(entityFactories).filter(function (factory) {
            return (factory.canBuild(json));
        }).map(function (factory) {
            if(defaultOrgId){
                json.orgId=defaultOrgId;
            }
            if(defaultBy){
                json.by=defaultBy;
            }
            return new factory(json);
        });
        
        return candidates.length>0?candidates[0]:null;
    }

};

module.exports = EntityFactory;

