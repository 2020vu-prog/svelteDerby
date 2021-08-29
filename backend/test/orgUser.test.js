console.log("pwd:",process.cwd());

const EntityFactory = require("../modules/lambdaDerby/src/shared/EntityFactory.js");
        const nowEpochSeconds = Math.round(new Date().getTime() / 1000);
        const entityFactory = new EntityFactory({
            orgIz: "testme",
            by: "tjest",
        });



const cut={

    "PK": "myorgtest:OrgPerm",

    "SK": "xyz.com",
    "orgIz": "xyz",
    "roleList": [
        "xyyyrole"
    ]
}

  const cobj = entityFactory.build(cut);
cobj.preWrite();
console.log(cobj);

test("OrgPerm Factory", () => {
    expect(cobj.email==="xyz.com");
});
