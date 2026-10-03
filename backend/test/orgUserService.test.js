const OrgUserService = require("../modules/lambdaDerby/src/OrgUserService.js");

const perm = (SK, roleList, extra = {}) => ({ SK, roleList, ...extra });

function build(permsByOrgIz = {}, overrides = {}) {
    const entityFactory = {
        copyWith: jest.fn((changes) => ({ copiedWith: changes })),
        getHashFromEmail: jest.fn((email) => `hash:${email}`),
    };
    const ddbUtils = {
        ddbQueryOrgPerms: jest.fn(
            async ({ orgIz }) => permsByOrgIz[orgIz] ?? []
        ),
        addSingle: jest.fn(async () => ({ status: "ok" })),
        addBulk: jest.fn(async ({ bulk }) => ({
            status: "ok",
            count: bulk.length,
        })),
        ...overrides,
    };
    const requestContext = {
        getEntityFactory: jest.fn(() => entityFactory),
        setEntityFactory: jest.fn(),
    };
    return {
        service: new OrgUserService({ ddbUtils, requestContext }),
        ddbUtils,
        requestContext,
        entityFactory,
    };
}

describe("getOrgRoles", () => {
    const event = (userEmail) => ({ queryStringParameters: { userEmail } });
    const api = { email: "Me@X.com", roleList: ["r"] };

    test("returns the caller's roles when the requested email is theirs", async () => {
        const { service } = build();

        await expect(
            service.getOrgRoles(event("me@x.COM"), api)
        ).resolves.toEqual({ roleList: ["r"], email: "me@x.com" });
    });

    test.each([
        ["someone else's email", event("other@x.com")],
        ["no query string", {}],
        ["no userEmail", { queryStringParameters: {} }],
    ])("returns no roles for %s", async (label, request) => {
        const { service } = build();

        await expect(service.getOrgRoles(request, api)).resolves.toEqual({
            roleList: [],
            email: "me@x.com",
        });
    });
});

describe("listOrgUser", () => {
    test("lists the permissions of the caller's org", async () => {
        const { service, ddbUtils } = build({ Org1: [perm("a@x.com", ["x"])] });

        await expect(
            service.listOrgUser({}, { orgIz: "Org1" })
        ).resolves.toEqual([perm("a@x.com", ["x"])]);
        expect(ddbUtils.ddbQueryOrgPerms).toHaveBeenCalledWith({
            orgIz: "Org1",
        });
    });
});

describe("addOrgUser", () => {
    const user = {
        email: "  a@x.com ",
        orgIz: "Org1",
        roleList: ["r"],
        displayName: "D",
    };

    test("saves a trimmed OrgPerm record and refreshes display names", async () => {
        const { service, ddbUtils, requestContext } = build({
            Org1: [perm("a@x.com", ["r"], { dn: "D" })],
        });

        const result = await service.addOrgUser(
            { ...user },
            { orgId: "Org1.abc" }
        );

        expect(requestContext.setEntityFactory).toHaveBeenCalledWith({
            copiedWith: { orgIz: "Org1", orgId: undefined, TTL: undefined },
        });
        expect(ddbUtils.addSingle).toHaveBeenCalledWith({
            ...user,
            email: "a@x.com",
            PK: "Org1:OrgPerm",
            SK: "a@x.com",
        });
        expect(ddbUtils.addBulk).toHaveBeenCalledWith({
            bulk: [
                {
                    PK: "UserDisplayName",
                    orgId: "Org1.abc",
                    SK: "hash:a@x.com",
                    displayName: "D",
                },
            ],
        });
        expect(result.status).toBe("ok");
    });

    test("prefers the orgId in the body, and accepts dn for the display name", async () => {
        const { service, ddbUtils } = build({
            Org1: [perm("a@x.com", [], { dn: "A" })],
        });

        await service.addOrgUser(
            { ...user, displayName: undefined, dn: "DN", orgId: "Body.org" },
            { orgId: "Api.org" }
        );

        expect(ddbUtils.addBulk.mock.calls[0][0].bulk[0].orgId).toBe(
            "Body.org"
        );
    });

    test.each(["email", "orgIz", "roleList", "displayName"])(
        "requires %s",
        async (field) => {
            const { service, ddbUtils } = build();

            await expect(
                service.addOrgUser(
                    { ...user, [field]: undefined },
                    { orgId: "o" }
                )
            ).resolves.toEqual({ error: "missing field(s)" });
            expect(ddbUtils.addSingle).not.toHaveBeenCalled();
        }
    );

    test("reports an error when either write fails", async () => {
        const failedSave = build(
            {},
            { addSingle: jest.fn(async () => ({ status: "error" })) }
        );
        const result = await failedSave.service.addOrgUser(
            { ...user },
            { orgId: "o" }
        );
        expect(result.status).toBe("error");
        expect(result.orgPermResult).toEqual({ status: "error" });
    });
});

describe("refreshUserDisplayNamesFromOrgPerm", () => {
    test.each([
        [{ orgId: "o" }],
        [{ orgIz: "Org1" }],
        [{ orgIz: "", orgId: "o" }],
    ])("requires an orgIz and orgId: %j", async (json) => {
        const { service } = build();

        await expect(
            service.refreshUserDisplayNamesFromOrgPerm(json)
        ).resolves.toEqual({ error: "missing field(s)" });
    });

    test("writes names for the org's and global users, skipping the unnamed", async () => {
        const { service, ddbUtils } = build({
            "": [perm("g@x.com", [], { displayName: "G" })],
            Org1: [
                perm("a@x.com", [], { dn: "A" }),
                perm("b@x.com", []),
                perm("c@x.com", [], { displayName: "C", dn: "ignored" }),
            ],
        });

        const result = await service.refreshUserDisplayNamesFromOrgPerm({
            orgIz: "Org1",
            orgId: "o",
        });

        expect(
            ddbUtils.addBulk.mock.calls[0][0].bulk.map((b) => [
                b.SK,
                b.displayName,
            ])
        ).toEqual([
            ["hash:g@x.com", "G"],
            ["hash:a@x.com", "A"],
            ["hash:c@x.com", "C"],
        ]);
        expect(result).toMatchObject({
            status: "ok",
            created: 3,
            skipped: 1,
            total: 4,
        });
    });

    test("does not write when nobody has a name", async () => {
        const { service, ddbUtils } = build({ Org1: [perm("a@x.com", [])] });

        await expect(
            service.refreshUserDisplayNamesFromOrgPerm({
                orgIz: "Org1",
                orgId: "o",
            })
        ).resolves.toMatchObject({
            status: "ok",
            created: 0,
            skipped: 1,
            total: 1,
        });
        expect(ddbUtils.addBulk).not.toHaveBeenCalled();
    });

    test("returns a failed permission query as it is", async () => {
        const failure = { error: "nope" };
        const { service } = build(
            {},
            {
                ddbQueryOrgPerms: jest.fn(async ({ orgIz }) =>
                    orgIz ? failure : []
                ),
            }
        );

        await expect(
            service.refreshUserDisplayNamesFromOrgPerm({
                orgIz: "Org1",
                orgId: "o",
            })
        ).resolves.toBe(failure);
    });
});

describe("getUserRoles", () => {
    test("merges org and global roles without duplicates, matching email case-insensitively", async () => {
        const { service } = build({
            Org1: [perm("A@x.com", ["r1", "r2"])],
            "": [perm("a@x.com", ["r2", "r3"])],
        });

        await expect(service.getUserRoles("Org1", "a@X.com")).resolves.toEqual([
            "r1",
            "r2",
            "r3",
        ]);
    });

    test("has no roles without an email or a matching user", async () => {
        const { service } = build({ Org1: [perm("z@x.com", ["r"])] });

        await expect(service.getUserRoles("Org1", undefined)).resolves.toEqual(
            []
        );
        await expect(service.getUserRoles("Org1", "a@x.com")).resolves.toEqual(
            []
        );
    });

    test("uses the first matching record, even if it has no roles", async () => {
        const { service } = build({
            Org1: [perm("a@x.com", undefined), perm("a@x.com", ["r"])],
        });

        await expect(
            service.getUserRolesForOrgIz("Org1", "a@x.com")
        ).resolves.toEqual([]);
    });
});
