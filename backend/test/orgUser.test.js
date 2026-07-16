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
    "dn": "Example User",
    "roleList": [
        "xyyyrole"
    ]
}

  const cobj = entityFactory.build(cut);
cobj.preWrite();
console.log(cobj);

test("OrgPerm Factory", () => {
    expect(cobj.email).toBe("xyz.com");
    expect(cobj.displayName).toBe("Example User");
});

test("OrgPerm Factory maps displayName to dn", () => {
    const displayNameEntity = entityFactory.build({
        PK: "myorgtest:OrgPerm",
        SK: "xyz.com",
        orgIz: "xyz",
        displayName: "Display Name User",
        roleList: ["xyyyrole"],
    });
    displayNameEntity.preWrite();

    expect(displayNameEntity.dn).toBe("Display Name User");
    expect(displayNameEntity.displayName).toBe("Display Name User");
});

test("EntityFactory hashes normalized email", () => {
    expect(entityFactory.getHashFromEmail(" Test@Example.com ")).toBe(
        "OvMXT6EO"
    );
});

test("EntityFactory adds byH without raw email", () => {
    const hashingFactory = new EntityFactory({
        orgIz: "testme",
        by: "tjest",
        byEmail: " Test@Example.com ",
    });
    const json = {
        PK: "myorgtest:OrgPerm",
        SK: "xyz.com",
        dn: "Example User",
        roleList: ["xyyyrole"],
    };

    const entity = hashingFactory.build(json);
    entity.preWrite();

    expect(entity.byH).toBe("OvMXT6EO");
    expect(entity.email).toBe("xyz.com");
    expect(entity.dn).toBe("Example User");
    expect(entity.displayName).toBe("Example User");
    expect(entity.email).not.toBe(" Test@Example.com ");
    expect(Object.keys(entity)).not.toContain("_byEmailHash");
    expect(Object.keys(entity)).not.toContain("byEmail");
    expect(Object.keys(entity)).not.toContain("email");
    expect(json.byEmail).toBeUndefined();
    expect(json.email).toBeUndefined();
});

test("UserDisplayName Factory", () => {
    const displayNameEntity = entityFactory.build({
        PK: "UserDisplayName",
        orgId: "myorgtest",
        byEmailHash: "OvMXT6EO",
        displayName: "Example User",
    });
    displayNameEntity.preWrite();

    expect(displayNameEntity.PK).toBe("myorgtest:UserDisplayName");
    expect(displayNameEntity.SK).toBe("OvMXT6EO");
    expect(displayNameEntity.byEmailHash).toBe("OvMXT6EO");
    expect(displayNameEntity.displayName).toBe("Example User");
    expect(displayNameEntity.classType).toBe("UserDisplayName");
    expect(displayNameEntity.classKey).toBe("OvMXT6EO");
});

test("UserDisplayName Factory builds persisted records", () => {
    const displayNameEntity = entityFactory.build({
        PK: "myorgtest:UserDisplayName",
        SK: "OvMXT6EO",
        orgId: "myorgtest",
        displayName: "Example User",
    });

    expect(displayNameEntity.byEmailHash).toBe("OvMXT6EO");
    expect(displayNameEntity.classType).toBe("UserDisplayName");
    expect(displayNameEntity.classKey).toBe("OvMXT6EO");
});
