<script>
    import log from "loglevel";

    import SpinnerButton from "./SpinnerButton.svelte";
    import { raceConfig, axios } from "./stores.js";
    import { push, pop, replace } from "svelte-spa-router";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import {
        getCacheKey,
        getChartCacheKey,
        theme,
        doRefreshBlocks,
    } from "./stores.js";

    $: {
        document.documentElement.style.setProperty(
            `--themeFromJS`,
            `${$theme}`
        );
    }
    $: {
        if (mounted && day && time && division && namingToolEnabled) {
            chartAddForm.chartName = `${day} ${time} ${division}`;
        }
    }

    // Keep an updated copy of all currently existing bracket names to enable duplication warning
    var bmdFromDexie = [{ bracketName: "Initializing..." }];

    $: {
        refreshDataFromDb($doRefreshBlocks);
    }

    const refreshDataFromDb = async (trigger) => {
        log.debug("refreshDataFromDb data:", trigger);

        bmdFromDexie = await db.BracketMetaData.toArray();
    };

    var jsReady = false;
    var treeReady = false;
    var mounted = false;
    var s3ChartTypes = false;
    var chartAddForm = {};

    var submitDisabled = true;
    var submitSpinning = false;

    var chartSelected = "Chart Selected: ";
    var namingToolEnabled = true;
    var day;
    var time;
    var division;
    var duplicateChartNameWarning = false;

    $: {
        if (
            !Array.isArray(bmdFromDexie) ||
            !chartAddForm ||
            !chartAddForm.chartName
        ) {
            duplicateChartNameWarning = false;
        } else {
            duplicateChartNameWarning = bmdFromDexie.some(function (b) {
                return (
                    b &&
                    !b.del &&
                    b.bracketName.toLowerCase() ===
                        chartAddForm.chartName.toLowerCase()
                );
            });
        }
    }

    $: {
        syncAddButton(chartAddForm.chartName);
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
        presetBracketNameSelections();
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
                        chartAddForm.bracketSelected = data.selected[0];
                    } else {
                        chartAddForm.bracketSelected = "";
                    }
                    syncAddButton();
                });
        }
    };
    async function handleSubmit() {
        log.debug("Adding:" + JSON.stringify(chartAddForm));

        const combinedJson =
            chartAddForm.bracketSelected.replace(/\.png$/i, "") +
            ".combined.json";
        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            imgPath: chartAddForm.bracketSelected,
            jsonPath: combinedJson,
            bracketName: chartAddForm.chartName,
        };

        submitSpinning = true;

        $axios
            .post($raceConfig.baseUrl + "/addChart", req)
            .then((response) => {
                log.debug("addChart axios success");
                pop();
            })
            .catch((err) => {
                submitSpinning = false;
                log.debug("addChart failed: " + err);
            });
        chartAddForm.chartName = "";
        chartAddForm.bracketSelected = "";
    }
    function syncAddButton() {
        if (!mounted) {
            return;
        }
        submitDisabled = !(
            chartAddForm.bracketSelected && chartAddForm.chartName
        );
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

        $axios
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

    function presetBracketNameSelections() {
        var d = new Date();
        if (d.getDay() == 6) {
            day = "Sat";
        } else if (d.getDay() == 0) {
            day = "Sun";
        }

        if (d.getHours() > 12) {
            time = "PM";
        } else {
            time = "AM";
        }
    }
</script>

<svelte:head>
    <script
        src="https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js"
        on:load={jqLoaded}
    >
    </script>
</svelte:head>
<link
    rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/jstree/3.2.1/themes/default/style.min.css"
/>

<h3>Add Chart</h3>
<form>
    <h4>Chart File</h4>

    <label>
        Select a Chart:
        <div id="jstree_demo_div" />
    </label>
    <p>{chartSelected}</p>

    <hr />

    <h4>Chart Name</h4>
    <br />

    <p
        style="float:left; display: flex; align-items: center; height: 38px; margin: 0; margin-right: 7.5px;"
    >
        Naming Style:
    </p>
    <div class="switch-toggle" style="max-height: 38px;">
        <input
            id="automated"
            name="namingToolEnabled"
            type="radio"
            bind:group={namingToolEnabled}
            value={true}
        />
        <label for="automated" onclick="">Automated</label>

        <input
            id="manual"
            name="namingToolEnabled"
            type="radio"
            bind:group={namingToolEnabled}
            value={false}
        />
        <label for="manual" onclick="">Manual</label>
    </div>
    <br />
    <br />

    {#if namingToolEnabled}
        <p
            style="float:left; display: flex; align-items: center; height: 38px; margin: 0; margin-right: 7.5px;"
        >
            Day:
        </p>
        <div class="switch-toggle" style="max-height: 38px;">
            <input
                id="sat"
                name="day"
                type="radio"
                bind:group={day}
                value="Sat"
            />
            <label for="sat" onclick="">Sat</label>

            <input
                id="sun"
                name="day"
                type="radio"
                bind:group={day}
                value="Sun"
            />
            <label for="sun" onclick="">Sun</label>
        </div>
        <br />
        <br />

        <p
            style="float:left; display: flex; align-items: center; height: 38px; margin: 0; margin-right: 7.5px;"
        >
            Time:
        </p>
        <div class="switch-toggle" style="max-height: 38px;">
            <input
                id="am"
                name="time"
                type="radio"
                bind:group={time}
                value="AM"
            />
            <label for="am" onclick="">AM</label>

            <input
                id="pm"
                name="time"
                type="radio"
                bind:group={time}
                value="PM"
            />
            <label for="pm" onclick="">PM</label>

            <input
                id="double"
                name="time"
                type="radio"
                bind:group={time}
                value="Double"
            />
            <label for="double" onclick="">Double</label>

            <input
                id="single"
                name="time"
                type="radio"
                bind:group={time}
                value="Single"
            />
            <label for="single" onclick="">Single</label>
        </div>
        <br />
        <br />
        <p
            style="float:left; display: flex; align-items: center; height: 38px; margin: 0; margin-right: 7.5px;"
        >
            Division:
        </p>
        <div class="switch-toggle" style="max-height: 38px;">
            <input
                id="stock"
                name="class"
                type="radio"
                bind:group={division}
                value="Stock"
            />
            <label for="stock" onclick="">Stock</label>

            <input
                id="ss"
                name="class"
                type="radio"
                bind:group={division}
                value="SS"
            />
            <label for="ss" onclick="">SS</label>

            <input
                id="masters"
                name="class"
                type="radio"
                bind:group={division}
                value="Masters"
            />
            <label for="masters" onclick="">Masters</label>

            <input
                id="legacy"
                name="class"
                type="radio"
                bind:group={division}
                value="Legacy"
            />
            <label for="legacy" onclick="">Legacy</label>

            <input
                id="wrap"
                name="class"
                type="radio"
                bind:group={division}
                value="Wrap"
            />
            <label for="wrap" onclick="">Wrap</label>
        </div>
        <br />
    {/if}
    <br />
    <label>
        Chart Name:
        <input
            type="text"
            bind:value={chartAddForm.chartName}
            placeholder="Chart Name"
        />
    </label>

    {#if duplicateChartNameWarning}
        <div class="alert alert-warning" role="alert">
            Warning &#9888;: A non-hidden chart with this name already exists.
            This will confuse users.
        </div>
    {/if}

    <br />
    <SpinnerButton
        disabled={submitDisabled}
        on:click={handleSubmit}
        spinning={submitSpinning}
    >
        Add
    </SpinnerButton>
</form>

<style>
    :root {
        --themeFromJS: "black";
    }

    .switch-toggle {
        float: left;
        background: #242729;
        border-radius: 20px;
        overflow: hidden;
    }

    .switch-toggle input {
        position: absolute;
        opacity: 0;
    }

    .switch-toggle input + label {
        padding: 7px;
        float: left;
        color: #fff;
        cursor: pointer;
        background-color: #242729;
        transition: background-color 0.4s ease;
    }

    .switch-toggle input:checked + label {
        background: var(--themeFromJS);
    }
</style>
