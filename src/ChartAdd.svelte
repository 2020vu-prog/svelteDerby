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
        console.log("mounted focus");
        document.getElementById("carNumber").focus();

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
                        { "id": "ajson1", "parent": "#", "text": "Simple root node" },
                        { "id": "ajson2", "parent": "#", "text": "Root node 2" },
                        { "id": "ajson3", "parent": "ajson2", "text": "Child 1" },
                        { "id": "ajson4", "parent": "ajson2", "text": "Child 2" },
                    ]
                }
            });
            window.$('#jstree_demo_div').on("changed.jstree", function (e, data) {
                console.log(data.selected);
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
            number: loginForm.carNumber,
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
        loginForm.carNumber = "";
    }
    const loginForm = {
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

        <input id="carNumber" type="number" bind:value={loginForm.carNumber} placeholder="Car Number" />
    </label>
    <label>
        ChartName:
        <input type="text" bind:value={loginForm.chartName} placeholder="Chart Name" />
    </label>
    <button type="submit">Add</button>
</form>