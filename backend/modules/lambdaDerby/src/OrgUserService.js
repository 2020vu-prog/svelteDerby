"use strict";
const log = require("loglevel");

class OrgUserService {
    constructor({ ddbUtils, requestContext }) {
        this.ddbUtils = ddbUtils;
        this.requestContext = requestContext;
    }

    async getOrgRoles(event, apiProps) {
        log.debug("getOrgRoles: apiEmail:", apiProps);
        log.debug("getOrgRoles: qsEmail:", event.queryStringParameters);
        if (
            event &&
            event.queryStringParameters &&
            event.queryStringParameters.userEmail &&
            apiProps &&
            apiProps.email
        ) {
            if (
                apiProps.email.toLowerCase() ===
                event.queryStringParameters.userEmail.toLowerCase()
            ) {
                return {
                    roleList: apiProps.roleList,
                    email: apiProps.email.toLowerCase(),
                };
            }
        }
        return {
            // no roles on error
            roleList: [],
            email: apiProps.email.toLowerCase(),
        };
        return { statusCode: 403, error: "email not aligned" };
    }
    async listOrgUser(event, apiProps) {
        const rolesByOrg = await this.ddbUtils.ddbQueryOrgPerms({
            orgIz: apiProps.orgIz,
        });
        return rolesByOrg;
    }
    async addOrgUser(json, apiProps) {
        log.debug("addOrgUser: " + JSON.stringify(json));

        if (json.email) {
            json.email = json.email.trim();
        }
        const orgId = json.orgId || apiProps.orgId;
        const displayName = json.displayName || json.dn;
        if (json.email && json.orgIz && json.roleList && orgId && displayName) {
            json.PK = json.orgIz + ":OrgPerm"; // force OrgPerm
            json.SK = json.email;
            const tmpEntityFactory = this.requestContext
                .getEntityFactory()
                .copyWith({
                    orgIz: json.orgIz,
                    orgId: undefined,
                    TTL: undefined,
                });
            this.requestContext.setEntityFactory(tmpEntityFactory);

            const orgPermResult = await this.ddbUtils.addSingle(json);
            const userDisplayNameResult =
                await this.refreshUserDisplayNamesFromOrgPerm({
                    orgIz: json.orgIz,
                    orgId,
                });

            return {
                status:
                    orgPermResult.status === "ok" &&
                    userDisplayNameResult.status === "ok"
                        ? "ok"
                        : "error",
                orgPermResult,
                userDisplayNameResult,
            };
        } else {
            return { error: "missing field(s)" };
        }
    }
    async refreshUserDisplayNamesFromOrgPerm(json) {
        log.debug(
            "refreshUserDisplayNamesFromOrgPerm: " + JSON.stringify(json)
        );

        const orgIz = json.orgIz;
        const orgId = json.orgId;
        if (!orgIz || !orgId) {
            return { error: "missing field(s)" };
        }

        const orgIzList = orgIz === "" ? [""] : ["", orgIz];
        const orgPermGroups = await Promise.all(
            orgIzList.map((orgIzForQuery) =>
                this.ddbUtils.ddbQueryOrgPerms({ orgIz: orgIzForQuery })
            )
        );
        for (const orgPermGroup of orgPermGroups) {
            if (!Array.isArray(orgPermGroup)) {
                return orgPermGroup;
            }
        }
        const orgPerms = orgPermGroups.flat();

        const bulk = [];
        let skipped = 0;
        for (const orgPerm of orgPerms) {
            const displayName = orgPerm.displayName || orgPerm.dn;
            if (!orgPerm.SK || !displayName) {
                skipped += 1;
                continue;
            }

            bulk.push({
                PK: "UserDisplayName",
                orgId,
                SK: this.requestContext
                    .getEntityFactory()
                    .getHashFromEmail(orgPerm.SK),
                displayName,
            });
        }
        const bulkResult = bulk.length
            ? await this.ddbUtils.addBulk({ bulk })
            : { status: "ok", count: 0 };

        return {
            status: bulkResult.status,
            created: bulkResult.count,
            skipped,
            total: orgPerms.length,
            bulkResult,
        };
    }
    async getUserRoles(orgIz, email) {
        const roleList = [];
        const orgPerms = await this.getUserRolesForOrgIz(orgIz, email);
        const globalPerms = await this.getUserRolesForOrgIz("", email);
        roleList.push(...orgPerms, ...globalPerms);
        return [...new Set(roleList)];
    }
    async getUserRolesForOrgIz(orgIz, email) {
        var rolesByUser = await this.ddbUtils.ddbQueryOrgPerms({
            orgIz: orgIz,
        });
        log.debug(`rolesByUser event [${orgIz}:${email}]`, rolesByUser);

        if (!email || !rolesByUser || !rolesByUser.length) {
            return [];
        }
        rolesByUser = rolesByUser.filter(
            (ouser) => ouser.SK.toLowerCase() === email.toLowerCase()
        );
        if (rolesByUser && rolesByUser.length > 0 && rolesByUser[0].roleList) {
            return rolesByUser[0].roleList;
        }
        return [];
    }
}

module.exports = OrgUserService;
