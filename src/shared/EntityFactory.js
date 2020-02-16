const entityFactories = {};
entityFactories['RaceStanding'] = class RaceStanding {
    members = ["PK", "SK", "at", "by", "name", "carNumbers", "orgID"];

    static canBuild(json) {
        return (json.PK && json.PK.endsWith(":RS"));
    }
    constructor(props) {

        for (let [key, value] of Object.entries(props)) {
            if (this.members.includes(key)) {
                this[key] = value;

            }
        }
    }
};
entityFactories['Participant'] = class Participant {
    static members = ["PK", "SK", "at", "by", "name", "number", "orgID"];
    static canBuild(json) {
        return (json.PK && json.PK.endsWith(":PTCP"));
    }
    constructor(props) {
        for (let [key, value] of Object.entries(props)) {
            this[key] = value;
        }
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
console.log(ef.build({ PK: "foo:PTCP", bar: "none", number: 100 }));
console.log(ef.build({ PK: "foo:RS", carNumbers: [101, 102] }));