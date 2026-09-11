<script>
    import log from "loglevel";
    import { Card, CardBody, CardHeader, CardTitle, Badge } from "sveltestrap";
    import VirtualList from "@sveltejs/svelte-virtual-list";
    import { uiPageSize, axios, raceConfig } from "./stores.js";
    import { safeGetAt } from "./utils.js";
    import { onMount } from "svelte";
    import { push } from "svelte-spa-router";
    const EntityFactory = require("../../backend/modules/lambdaDerby/src/shared/EntityFactory.js");

    const entityFactory = new EntityFactory({});
    var orgUserList = [];
    onMount(async () => {
        orgUserList = await getOrgUsersAsList();
    });
    const filterMatches = (driver, lclFilter) => {
        if (!lclFilter) return true;
        let re = new RegExp("^" + lclFilter);
        return String(driver).match(re);
    };
    async function getOrgUsersAsList() {
        try {
            const endPoint = "/listOrgUser";
            const req = {
                orgIz: $raceConfig.orgIz,
            };
            const response = await $axios.get($raceConfig.baseUrl + endPoint, {
                params: req,
            });
            log.debug("getOrgUsers:", response.data);

            return response.data;
        } catch (e) {
            return [];
        }
    }
    function editOrgUser(item) {
        const orgIz = $raceConfig.orgIz;
        const b64 = btoa(JSON.stringify(item));
        push(`/orgUserAdd/${b64}`);
    }
</script>

<h4>Org User List</h4>

<p />

{#each orgUserList as item (item.at)}
    <Card class="mt-3 border border-info" on:click={() => editOrgUser(item)}>
        <CardBody>
            <div>
                {item.SK}
                <br />
                {item.dn || item.displayName || ""}
                <br />
                {JSON.stringify(item.roleList)}
                <br />
                Email hash: [{entityFactory.getHashFromEmail(item.SK)}]
            </div>
        </CardBody>
    </Card>
{/each}
