<script>
    import log from "loglevel";
    import { onMount } from "svelte";
    import SpinnerButton from "./SpinnerButton.svelte";
    import { axios, raceConfig, pushMessage } from "./stores.js";
    import { push, pop, replace } from "svelte-spa-router";

    const {
        getNamedRoles,
    } = require("../../backend/modules/lambdaDerby/src/shared/PermissionLookup.js");

    export let params = {};
    var b64User = "";
    var mode = "Add";
    var selectedRoles = [];
    var menu = getNamedRoles();
    var submitDisabled = false;
    var submitSpinning = false;

    const userForm = {
        email: "",
        roles: "",
        deleteFlag: false,
    };
    $: {
        console.log("selected:", selectedRoles);
        userForm.roles = JSON.stringify(selectedRoles);
    }
    onMount(async () => {
        b64User = params.b64User;
        log.debug(`OrgUserAdd tgtEmail: ${b64User}`);
        if (b64User) {
            const jsonUser = JSON.parse(atob(b64User));

            log.debug(`OrgUserAdd tgtObject: ${jsonUser}`);
            mode = "Update";
            userForm.email = jsonUser.SK;
            selectedRoles = jsonUser.roleList;
        }
    });
    async function handleSubmit() {
        log.debug(`handleSubmit: ${mode}` + JSON.stringify(userForm));

        const req = {
            orgIz: $raceConfig.orgIz,
            email: userForm.email,
            roleList: selectedRoles,
        };
        if (userForm.deleteFlag) {
            req.TTL = 999; // low epoch will delete.
        }

        const url = $raceConfig.baseUrl + "/addOrgUser";
        submitSpinning = true;
        try {
            const response = await $axios.post(url, req);
            pushMessage( {
                text: `User [${userForm.email}] processed.`,
                type: "success",
            });
            pop();
        } catch (error) {
            log.debug("axios err:", e);
        }
    }
</script>

<h4>{mode} Org User</h4>
<form>
    <label>
        Email:
        <input
            type="text"
            bind:value={userForm.email}
            placeholder="user@example.com"
        />
    </label>
    <!--
    <label>
        Roles
        <input type="text" disabled=true bind:value={userForm.roles} placeholder="Driver Name" />
    </label>
    -->
    <label>
        Roles
        <select multiple bind:value={selectedRoles}>
            {#each menu as flavour}
                <option value={flavour}>{flavour}</option>
            {/each}
        </select>
    </label>

    {#if mode == "Update"}
        <label>
            Delete User
            <input type="checkbox" class="big" bind:checked={userForm.deleteFlag} />
        </label>
    {/if}
    <SpinnerButton
        disabled={submitDisabled}
        on:click={handleSubmit}
        spinning={submitSpinning}
    >
        {mode}
    </SpinnerButton>
</form>
