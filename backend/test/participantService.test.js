const ParticipantService = require("../modules/lambdaDerby/src/ParticipantService.js");
const RoutePermission = require("../modules/lambdaDerby/src/shared/RoutePermission.js");

function buildService(found) {
    const ddbUtils = {
        ddbQueryPkSk: jest.fn(async () => found),
        addSingle: jest.fn(async (entity) => ({ status: "ok", entity })),
    };
    return { ddbUtils, service: new ParticipantService(ddbUtils) };
}

test("logical delete writes a full participant tombstone", async () => {
    const participant = {
        PK: "event1:PTCP",
        SK: "123",
        orgId: "event1",
        number: "123",
        name: "Driver Name",
        maintainerHashes: ["hash"],
    };
    const { ddbUtils, service } = buildService(participant);

    const result = await service.logicalDelete(
        { orgId: "untrusted-event", number: 123 },
        { orgId: "event1" }
    );

    expect(ddbUtils.ddbQueryPkSk).toHaveBeenCalledWith("event1:PTCP", "123");
    expect(ddbUtils.addSingle).toHaveBeenCalledWith({
        ...participant,
        del: true,
    });
    expect(result.status).toBe("ok");
});

test("logical delete rejects missing and unknown participants", async () => {
    const { ddbUtils, service } = buildService(undefined);

    await expect(
        service.logicalDelete({}, { orgId: "event1" })
    ).resolves.toEqual({
        status: "error",
        error: "Missing participant number.",
    });
    await expect(
        service.logicalDelete({ number: "404" }, { orgId: "event1" })
    ).resolves.toEqual({
        status: "error",
        error: "Participant [404] not found.",
    });
    expect(ddbUtils.addSingle).not.toHaveBeenCalled();
});

test("logical delete is idempotent", async () => {
    const participant = { number: "123", del: true };
    const { ddbUtils, service } = buildService(participant);

    await expect(
        service.logicalDelete({ number: "123" }, { orgId: "event1" })
    ).resolves.toEqual({ status: "ok", entity: participant });
    expect(ddbUtils.addSingle).not.toHaveBeenCalled();
});

test("registers delete with participant-management permission", () => {
    const { service } = buildService(undefined);
    const router = { register: jest.fn() };
    const buildResponse = jest.fn((result) => result);

    service.registerRoutes(router, { buildResponse });

    expect(router.register).toHaveBeenCalledWith(
        "/deleteParticipant",
        expect.objectContaining({
            permission: RoutePermission.CAN_ADD_PARTICIPANT,
            handler: expect.any(Function),
        })
    );
});
