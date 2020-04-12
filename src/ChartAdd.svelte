<script>
    import { raceConfig } from './stores.js';
    import { store } from './stores/auth.js'
    import { Auth } from 'aws-amplify';
    import { push, pop, replace } from 'svelte-spa-router'
    import { onMount } from 'svelte';

    import axios from "axios";

    var jsReady = false;
    var treeReady = false;
    var mounted = false;
    var loginForm = {};
    $:{syncAddButton(loginForm.chartName)}
    const jqLoaded = () => {
        console.log("jqloaded")
        jsReady = true;
        tryBuild();
    };
    const jsTreeLoaded = () => {
        console.log("jstreeloaded")
        treeReady = true;
        tryBuild();

    };
    onMount(async () => {
        mounted = true;
        tryBuild();

    });
    const tryBuild = () => {
        if (treeReady && mounted && jsReady) {
            console.log("GO");
            //  window.$(function () { window.$('#jstree_demo_div').jstree(); });

            window.$('#jstree_demo_div').jstree({
                'core': {
                    'data': [
                        { "id": "aasbd", "parent": "#", "text": "AASBD" },
                        { "id": "ndr", "parent": "#", "text": "NDR" },
                        { "id": "ndrDoubles", "parent": "ndr", "text": "Doubles" },
                        { "id": "ndrDouble6", "parent": "ndrDoubles", "text": "6 Car" },
                        { "id": "ndrSingles", "parent": "ndr", "text": "Singles" },
                        { "id": "aasbdDoubles", "parent": "aasbd", "text": "Doubles" },
                        { "id": "aasbdSingles", "parent": "aasbd", "text": "Singles" },
                    ]
                }
            });
            window.$('#jstree_demo_div').on("changed.jstree", function (e, data) {
                console.log(data.selected);
                loginForm.bracketSelected = data.selected;
                syncAddButton();
            });
        }
    }
    async function handleSubmit() {
        console.log("Adding:" + JSON.stringify(loginForm))
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            bracket: loginForm.bracketSelected,
            name: loginForm.chartName,
        }

        console.log("token:" + bearer)

        axios.defaults.headers.common['Authorization'] = bearer;

        axios.post($raceConfig.baseUrl + '/addChart', req)
            .then((response) => {
                console.log("addChart axios success")
                pop();
            })
            .catch((err) => {
                console.log("addChart failed: " + err)
            })
        loginForm.chartName = "";
        loginForm.bracketSelected = "";
    }
    function syncAddButton() {
        if (!mounted) {
            return;
        }
        if (loginForm.bracketSelected && loginForm.chartName) {
            document.getElementById("formSubmitButton").disabled = false;
            console.log("sync add button SYNC")
        } else {
            console.log("sync add button FAIL")
            document.getElementById("formSubmitButton").disabled = true;
        }
    }
// embedded script link: https://www.nielsvandermolen.com/external-javascript-sveltejs/

</script>
<svelte:head>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js" on:load={jqLoaded}></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jstree/3.2.1/jstree.min.js" on:load={jsTreeLoaded}></script>

</svelte:head>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/jstree/3.2.1/themes/default/style.min.css" />

<h3>Add Chart</h3>

<form on:submit|preventDefault={handleSubmit}>

    <label>
        Chart Type:
        <div id="jstree_demo_div"></div>
    </label>
    <label>
        ChartName:
        <input type="text" bind:value={loginForm.chartName} placeholder="Chart Name" />
    </label>
    <button id="formSubmitButton" type="submit" disabled>Add</button>
</form>