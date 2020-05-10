const entityFactories = {};
const RacePhaseEid = ":RP";
const RaceStandingEid = ":RS";
const ParticipantEid = ":PTCP";
const BracketMetaDataEid = ":Bmd";
const BracketPosEid = ":Bp";
const cHelper = (pthis, props, optionalMembers) => {
    //console.log (pthis.constructor.members) ;

    const members = optionalMembers
        ? optionalMembers
        : pthis.constructor.members;
    for (let [key, value] of Object.entries(props)) {
        //console.log("Chelper checking:"+key);

        if (members.includes(key)) {
            //console.log("Chelper applying:"+key);
            pthis[key] = value;
        }
    }
};

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
const EventConfigLit = "EventConfig";
entityFactories[EventConfigLit] = class EventConfig extends EntityBase {
    static members = [
        "lcl1", // lowCarlane1
        "orgIz", // Org Id (pending refactor)
        "name",
    ];
    static canBuild(json) {
        return json.PK && json.PK === EventConfigLit;
    }
    constructor(props) {
        super(props);
        cHelper(this, props);
    }
    preWrite() {
        super.preWrite();
        this.PK = EventConfigLit;

        this.SK = this.orgIz + ":" + this.orgId;
    }
    get classType() {
        return EventConfigLit;
    }
    get classKey() {
        return this.orgId;
    }
};

const OrgConfigLit = "OrgConfig";
entityFactories[OrgConfigLit] = class OrgConfig extends EntityBase {
    static members = ["lcl1"]; // lowCarlane1
    static canBuild(json) {
        return json.PK && json.PK === OrgConfigLit;
    }
    constructor(props) {
        super(props);
        cHelper(this, props);
    }
    preWrite() {
        super.preWrite();
        this.PK = OrgConfigLit;

        this.SK = this.orgIz;
    }
    get classType() {
        return OrgConfigLit;
    }
    get classKey() {
        return this.orgIz;
    }
};

const BracketMetaDataLit = "BracketMetaData";
entityFactories[BracketMetaDataLit] = class BracketMetaData extends EntityBase {
    static members = ["bracketName", "imgPath", "jsonPath"];
    static canBuild(json) {
        // client should populate SK for bracketMetaData!
        return json.PK && json.PK.endsWith(BracketMetaDataEid) && json.SK;
    }
    constructor(props) {
        super(props);
        cHelper(this, props);
    }
    preWrite() {
        super.preWrite();
        this.PK = this.orgId + BracketMetaDataEid;
    }
    get classType() {
        return BracketMetaDataLit;
    }
    get classKey() {
        return this.SK;
    }
};

/*
heatStatus[hs]? seedNeeded, pendingAddPending, waiting on (A), waiting on (B), done
heatNumber[hn]: "01"

pos: [
    {

    
    id: "A"
    status: "bye/forfeit/ptcp/empty" (optional)
    ptcp: "101"
    ptcp: ":bye:"
    ptcp: "forfeit:222"
    ptcp: "100"
}
*/
const BrackePosLit = "BracketPos";
entityFactories[BrackePosLit] = class BracketPos extends EntityBase {
    static members = ["hn", "pos", "hs"];
    static canBuild(json) {
        // client should populate SK for bracketMetaData!
        return json.PK && json.PK.endsWith(BracketPosEid) && json.SK;
    }
    constructor(props) {
        super(props);
        cHelper(this, props);
    }
    preWrite() {
        super.preWrite();
        this.PK = this.orgId + BracketPosEid;
    }
    get classType() {
        return BrackePosLit;
    }
    get classKey() {
        return this.SK;
    }
    set heatNumber(hn) {
        this.hn = hn;
    }
    get heatNumber() {
        return this.hn;
    }
    set heatStatus(hs) {
        this.hs = hs;
    }
    get heatStatus() {
        return this.hs;
    }
    set heatPositionMap(pos) {
        this.pos = pos;
    }
    get heatPositionMap() {
        return this.pos;
    }
    get isReadyToAddPending() {
        return this.isPtcpValid("A") && this.isPtcpValid("B");
    }
    isPtcpValid(ab) {
        const po = this.getPtcpObject(ab);
        return po && po.ptcp && po.disp === "ptcp";
    }
    getPtcpObject(ab) {
        return this.pos ? this.pos[ab] : {};
    }
    getPtcpNumber(ab) {
        return this.getPtcpObject(ab).ptcp;
    }

    //TODO: status->disp
    getPtcpStatus(ab) {
        return this.getPtcpObject(ab).status;
    }
    formatSK(chartId, heatNumber) {
        SK = `${chartId}:${heatNumber}`;
    }
    //TODO chartId setter (populate this.SK chartId?)
    get chartId() {
        // expecting SK to be chartId:heatNumber
        return this.SK.replace(/:.*/, "");
    }
};

entityFactories["RacePhase"] = class RacePhase extends EntityBase {
    static members = ["cn", "phr", "rs", "pl"];
    static canBuild(json) {
        return json.PK && json.PK.endsWith(RacePhaseEid);
    }
    constructor(props) {
        super(props);
        cHelper(this, props);
    }
    preWrite() {
        super.preWrite();
        this.PK = this.orgId + RacePhaseEid;

        if (!this.SK) {
            this.SK = new Date().getTime() + "";
        }
    }
    set phaseResults(results) {
        this.phr = results;
    }
    get phaseResults() {
        return this.phr;
    }
    // legacy emulation
    getPhaseDeltaMS() {
        if (!this.phr) return undefined;
        return this.phr[1] - this.phr[0];
    }
    get carNumbers() {
        return this.cn;
    }
    get phaseLiteral() {
        return this.pl;
    }
    set phaseLiteral(pl) {
        return (this.pl = pl);
    }
    get classType() {
        return "RacePhase";
    }
    get classKey() {
        return this.SK;
    }
};
entityFactories["RaceStanding"] = class RaceStanding extends EntityBase {
    static members = ["cn", "ph1", "ph2"];
    static eid = ":RS";
    static canBuild(json) {
        return json.PK && json.PK.endsWith(RaceStandingEid);
    }
    constructor(props) {
        super(props);
        cHelper(this, props);
    }
    preWrite() {
        super.preWrite();
        this.PK = this.orgId + RaceStandingEid;
        if (!this.SK) this.SK = new Date().getTime() + "";
    }
    nextRace() {
        if (!this.phase1Results) {
            return [...this.carNumbers];
        }
        if (!this.phase2Results) {
            return [...this.carNumbers].reverse();
        }
        return null;
    }
    // "A" or "B" phase?  (given carNumber list)
    getPhaseLiteral(phaseCarNumbers) {
        if (this.carNumbers.toString() == phaseCarNumbers.toString()) {
            return "A";
        } else {
            return "B";
        }
    }
    set phase1Results(ph1) {
        return (this.ph1 = ph1);
    }
    set phase2Results(ph2) {
        return (this.ph2 = ph2);
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
        if (this.isComplete()) {
            for (var i = 0; i < this.carNumbers.length; i++) {
                rc[i] = this.phase1Results[i] + this.phase2Results[i];
            }
        }
        return rc;
    }
    isOverallTie() {
        const distinctResults = [...new Set(this.overallResults)];
        return distinctResults.length == 1;
    }
    hasResults() {
        return this.carNumbers && this.phase1Results;
    }
    isComplete() {
        return this.carNumbers && this.phase1Results && this.phase2Results;
    }
    isPending() {
        return !this.isComplete();
    }
    // legacy emulation
    getPhaseXDeltaMS(x) {
        if (!x) return undefined;
        return x[1] - x[0];
    }
    get phase1DeltaMS() {
        return this.getPhaseXDeltaMS(this.phase1Results);
    }
    get phase2DeltaMS() {
        return this.getPhaseXDeltaMS(this.phase2Results);
    }
    get classType() {
        return "RaceStanding";
    }
    get classKey() {
        return this.SK;
    }
};
entityFactories["Participant"] = class Participant extends EntityBase {
    static members = ["name", "number"];
    static eid = ":PTCP";
    static canBuild(json) {
        return json.PK && json.PK.endsWith(ParticipantEid);
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
    get classType() {
        return "Participant";
    }
    get classKey() {
        return this.SK;
    }
};

class EntityFactory {
    propOverrides = {};
    constructor(propOverrides) {
        this.propOverrides = propOverrides;
    }
    build(json) {
        for (const [overrideKey, value] of Object.entries(this.propOverrides)) {
            json[overrideKey] = value;
        }
        const candidates = Object.values(entityFactories)
            .filter(function (factory) {
                return factory.canBuild(json);
            })
            .map(function (factory) {
                return new factory(json);
            });

        return candidates.length > 0 ? candidates[0] : null;
    }
    get entityTypes() {
        return Object.keys(entityFactories);
    }
}

module.exports = EntityFactory;
