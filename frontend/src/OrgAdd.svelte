<script>
    import log from "loglevel";

    import { axios, raceConfig } from "./stores.js";
    import { push, pop, replace } from "svelte-spa-router";
    import { onMount } from "svelte";

    var mounted = false;
    onMount(async () => {
        mounted = true;
    });

    async function handleSubmit() {
        syncAddButton();

        log.debug("Adding:" + JSON.stringify(orgForm));

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            lcl1: String(orgForm.lcl1),
            name: orgForm.name,
        };

        $axios
            .post($raceConfig.baseUrl + "/addOrg", req)
            .then((response) => {
                log.debug("addOrg axios success");
                pop();
            })
            .catch((err) => {
                log.debug("addOrg failed: " + err);
            });
        orgForm.name = "";
        orgForm.lcl1 = true;
    }
    const orgForm = {
        name: "",
        lcl1: true,
    };

    const syncAddButton = () => {
        if (!mounted) {
            return;
        }
        if (orgForm.name != "" && orgForm.name != undefined) {
            log.debug("name: " + orgForm.name);
            document.getElementById("formSubmitButton").disabled = false;
        } else {
            document.getElementById("formSubmitButton").disabled = true;
        }
    };
</script>

<h3>Add Organization</h3>

<form on:submit|preventDefault={handleSubmit}>
    <label>
        Name:
        <input
            id="name"
            type="text"
            bind:value={orgForm.name}
            placeholder="Organization Name"
            on:keyup={() => {
                syncAddButton();
            }}
        />
    </label>
    <label>
        LowCarLane1:
        <input
            type="checkbox"
            id="lcl1"
            on:change={syncAddButton()}
            bind:checked={orgForm.lcl1}
        />
    </label>
    <button id="formSubmitButton" type="submit" disabled>Add</button>
</form>
