<script>
    import { raceConfig } from "./stores.js";
    import { store } from "./stores/auth.js";
    import { Auth } from "aws-amplify";
    import { push, pop, replace } from "svelte-spa-router";
    import { onMount } from "svelte";
    import { getCacheKey } from "./stores.js";

    import axios from "axios";

    var jsReady = false;
    var treeReady = false;
    var mounted = false;
    var s3ChartTypes = false;
    var loginForm = {};
    $: {
        syncAddButton(loginForm.chartName);
    }
    const jqLoaded = () => {
        console.log("jqloaded");
        jsReady = true;
        const jsTreeUrl =
            "https://cdnjs.cloudflare.com/ajax/libs/jstree/3.2.1/jstree.min.js";
        jQuery.getScript(jsTreeUrl, jsTreeLoaded);
        tryBuild();
    };
    const jsTreeLoaded = () => {
        console.log("jstreeloaded");
        treeReady = true;
        tryBuild();
    };
    onMount(async () => {
        mounted = true;
        getChartDataFromServer();
        tryBuild();
    });
    const tryBuild = () => {
        if (treeReady && mounted && jsReady && s3ChartTypes) {
            console.log("GO");
            //  window.$(function () { window.$('#jstree_demo_div').jstree(); });
            /*
            const testData = {
              core: {
                data: [
                  { id: "aasbd", parent: "#", text: "AASBD" },
                  { id: "ndr", parent: "#", text: "NDR" },
                  { id: "ndr/Doubles", parent: "ndr", text: "Doubles" },
                  { id: "ndrDouble6", parent: "ndr/Doubles", text: "6 Car" },
                  { id: "ndr/Singles", parent: "ndr", text: "Singles" },
                  { id: "aasbd/Doubles", parent: "aasbd", text: "Doubles" },
                  { id: "aasbd/Singles", parent: "aasbd", text: "Singles" }
                ]
              }
            };
            */
            const testData2 = { core: { data: [] } };
            var keyList = getKeys(s3ChartTypes["Contents"]);
            testData2.core.data = keyList;
            window.$("#jstree_demo_div").jstree(testData2);
            window.$("#jstree_demo_div").on("changed.jstree", function (e, data) {
                console.log(data.selected);
                if (data.node.children.length > 0) {
                    window.$("#jstree_demo_div").jstree(true).deselect_node(data.node);
                    window.$("#jstree_demo_div").jstree(true).toggle_node(data.node);
                    document.getElementById("chartSelectedP").innerHTML = "Chart Selected: ";
                }
                document.getElementById("chartSelectedP").innerHTML = "Chart Selected: " + String(data.selected);
                if (data.selected && data.selected[0] && data.selected[0].includes(".")) {
                    loginForm.bracketSelected = data.selected[0];
                }
                else {
                    loginForm.bracketSelected = ""
                }
                syncAddButton();

            });
        }
    };
    async function handleSubmit() {
        console.log("Adding:" + JSON.stringify(loginForm));
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;
        axios.defaults.headers.common["Authorization"] = bearer;

        const combinedJson = loginForm.bracketSelected.replace(/\.png$/i, "") + ".combined.json";
        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            imgPath: loginForm.bracketSelected,
            jsonPath: combinedJson,
            bracketName: loginForm.chartName
        };

        console.log("token:" + bearer);


        axios
            .post($raceConfig.baseUrl + "/addChart", req)
            .then(response => {
                console.log("addChart axios success");
                pop();
            })
            .catch(err => {
                console.log("addChart failed: " + err);
            });
        loginForm.chartName = "";
        loginForm.bracketSelected = "";
    }
    function syncAddButton() {
        if (!mounted) {
            return;
        }
        const doEnable = (loginForm.bracketSelected && loginForm.chartName);
        document.getElementById("formSubmitButton").disabled = !doEnable;
        console.log("sync add button isEnabled:" + doEnable);

    }
    // embedded script link: https://www.nielsvandermolen.com/external-javascript-sveltejs/
    const getChartDataFromServer = async () => {
        const cacheKey = getCacheKey();
        const params = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            chris: "509d",  // get rid of /public/data/brackets again.
            cacheKey: cacheKey,
        }

        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;
        axios.defaults.headers.common["Authorization"] = bearer;
        axios
            .get(
                $raceConfig.baseUrl +
                "/listChartTypes", { params: params }
            )
            .then(response => {
                console.log("listChartTypes:" + response.data);
                s3ChartTypes = response.data;
                tryBuild();
            })
            .catch(err => {
                console.log(err);
            });
    };
    const getKeys = (json) => {
        const children = [];
        const parents = {};
        json.forEach(function (item) {
            var simpleKey = item.Key.replace("data/brackets/", "");
            console.log("simpleKey:", simpleKey)
            if (! /.png/i.test(simpleKey)) {
                return;
            }
            var structureArray = simpleKey.split("/");
            var child = "";

            //for (var i=structureArray.length-1;i>-1;i--) {}
            while (structureArray.length > 0) {
                if (!child) {
                    child = formatItem(structureArray);
                    children.push(child);
                } else {
                    const parent = formatItem(structureArray);
                    parents[parent.id] = parent;
                }
                structureArray.pop();
            }
        });
        const rc = [...Object.values(parents), ...children]
        rc.sort((a, b) => { return a.id.length - b.id.length })
        console.log(rc)
        return rc
    };
    const formatItem = structureArray => {
        const treeItem = {};
        treeItem.id = structureArray.join("/");
        treeItem.text = structureArray[structureArray.length - 1];
        if (structureArray.length > 1) {
            const tempParents = [...structureArray];
            tempParents.pop();  // just want the parents.
            treeItem.parent = tempParents.join("/");
        } else {
            treeItem.parent = "#";
        }
        console.log("format item ", structureArray, " gave: ", treeItem);

        return treeItem;
    };
</script>

<svelte:head>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js" on:load={jqLoaded}>

    </script>
</svelte:head>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/jstree/3.2.1/themes/default/style.min.css" />

<h3>Add Chart</h3>

<form on:submit|preventDefault={handleSubmit}>

    <label>
        Chart Type:
        <div id="jstree_demo_div" />
    </label>
    <p id="chartSelectedP">Chart Selected: </p>
    <label>
        ChartName:
        <input type="text" bind:value={loginForm.chartName} placeholder="Chart Name" />
    </label>
    <button id="formSubmitButton" type="submit" disabled>Add</button>
</form>