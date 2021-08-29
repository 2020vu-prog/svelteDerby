<script>
    import log from "loglevel";

    import SpinnerButton from "./SpinnerButton.svelte";
    import { raceConfig } from "./stores.js";
    import { Auth } from "aws-amplify";
    import { push, pop, replace } from "svelte-spa-router";
    import { onMount } from "svelte";
    import { getCacheKey, getChartCacheKey } from "./stores.js";

    import axios from "axios";

    var jsReady = false;
    var treeReady = false;
    var mounted = false;
    var s3ChartTypes = false;
    var loginForm = {};

    var submitDisabled = true;
    var submitSpinning = false;

    var chartSelected = "Chart Selected: ";

    $: {
        syncAddButton(loginForm.chartName);
    }
    const jqLoaded = () => {
        log.debug("jqloaded");
        jsReady = true;
        const jsTreeUrl =
            "https://cdnjs.cloudflare.com/ajax/libs/jstree/3.2.1/jstree.min.js";
        jQuery.getScript(jsTreeUrl, jsTreeLoaded);
        tryBuild();
    };
    const jsTreeLoaded = () => {
        log.debug("jstreeloaded");
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
            log.debug("GO");
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
            window
                .$("#jstree_demo_div")
                .on("changed.jstree", function (e, data) {
                    log.debug(data.selected);
                    if (data.node.children.length > 0) {
                        window
                            .$("#jstree_demo_div")
                            .jstree(true)
                            .deselect_node(data.node);
                        window
                            .$("#jstree_demo_div")
                            .jstree(true)
                            .toggle_node(data.node);
                        chartSelected = "Chart Selected: ";
                    }
                    chartSelected = "Chart Selected: " + String(data.selected);
                    if (
                        data.selected &&
                        data.selected[0] &&
                        data.selected[0].includes(".")
                    ) {
                        loginForm.bracketSelected = data.selected[0];
                    } else {
                        loginForm.bracketSelected = "";
                    }
                    syncAddButton();
                });
        }
    };
    async function handleSubmit() {
        log.debug("Adding:" + JSON.stringify(loginForm));
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;
        axios.defaults.headers.common["Authorization"] = bearer;

        const combinedJson =
            loginForm.bracketSelected.replace(/\.png$/i, "") + ".combined.json";
        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            imgPath: loginForm.bracketSelected,
            jsonPath: combinedJson,
            bracketName: loginForm.chartName,
        };

        submitSpinning = true;
        log.debug("token:" + bearer);

        axios
            .post($raceConfig.baseUrl + "/addChart", req)
            .then((response) => {
                log.debug("addChart axios success");
                pop();
            })
            .catch((err) => {
                submitSpinning = false;
                log.debug("addChart failed: " + err);
            });
        loginForm.chartName = "";
        loginForm.bracketSelected = "";
    }
    function syncAddButton() {
        if (!mounted) {
            return;
        }
        submitDisabled = !(loginForm.bracketSelected && loginForm.chartName);
    }
    // embedded script link: https://www.nielsvandermolen.com/external-javascript-sveltejs/
    const getChartDataFromServer = async () => {
        const cacheKey = getCacheKey();
        const params = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            chartCacheKey: getChartCacheKey(), //force invalidate cloudfront cache!
            cacheKey: cacheKey,
        };

        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;
        axios.defaults.headers.common["Authorization"] = bearer;
        axios
            .get($raceConfig.baseUrl + "/listChartTypes", { params: params })
            .then((response) => {
                log.debug("listChartTypes:" + response.data);
                s3ChartTypes = response.data;
                tryBuild();
            })
            .catch((err) => {
                log.debug(err);
            });
    };
    const getKeys = (json) => {
        const children = [];
        const parents = {};
        json.forEach(function (item) {
            var simpleKey = item.Key.replace("data/brackets/", "");
            log.debug("simpleKey:", simpleKey);
            if (!/.png/i.test(simpleKey)) {
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
        const rc = [...Object.values(parents), ...children];
        rc.sort((a, b) => {
            return a.id.length - b.id.length;
        });
        log.debug(rc);
        return rc;
    };
    const formatItem = (structureArray) => {
        const treeItem = {};
        treeItem.id = structureArray.join("/");
        treeItem.text = structureArray[structureArray.length - 1];
        if (structureArray.length > 1) {
            const tempParents = [...structureArray];
            tempParents.pop(); // just want the parents.
            treeItem.parent = tempParents.join("/");
        } else {
            treeItem.parent = "#";
        }
        log.debug("format item ", structureArray, " gave: ", treeItem);

        return treeItem;
    };
</script>

<svelte:head>
    <script
        src="https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js"
        on:load={jqLoaded}>

    </script>
</svelte:head>
<link
    rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/jstree/3.2.1/themes/default/style.min.css" />

<h3>Add Chart</h3>

<form>

    <label>
        Chart Type:
        <div id="jstree_demo_div" />
    </label>
    <p>{chartSelected}</p>
    <label>
        ChartName:
        <input
            type="text"
            bind:value={loginForm.chartName}
            placeholder="Chart Name" />
    </label>
    <SpinnerButton
        disabled={submitDisabled}
        on:click={handleSubmit}
        spinning={submitSpinning}>
        Add
    </SpinnerButton>
</form>
