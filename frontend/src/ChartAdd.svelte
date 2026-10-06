<script>
    import log from "loglevel";

    import SpinnerButton from "#src/SpinnerButton.svelte";
    import { raceConfig, axios } from "#src/stores.js";
    import { push, pop, replace } from "svelte-spa-router";
    import { onMount } from "svelte";
    import { db } from "#src/eventDb.js";
    import ChartTree from "#src/chart/chartTree/ChartTree.svelte";
    import { buildChartTree } from "#src/chart/chartTree/chartTree.js";
    import {
        getCacheKey,
        getChartCacheKey,
        theme,
        doRefreshBlocks,
    } from "#src/stores.js";

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

    var mounted = false;
    var s3ChartTypes = false;
    var chartListError = false;
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
    onMount(async () => {
        mounted = true;
        getChartDataFromServer();
        presetBracketNameSelections();
    });
    $: chartTree = buildChartTree(s3ChartTypes ? s3ChartTypes["Contents"] : []);
    function handleChartSelect(chartId) {
        chartAddForm.bracketSelected = chartId;
        chartSelected = "Chart Selected: " + chartId;
        syncAddButton();
    }
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
            })
            .catch((err) => {
                log.debug(err);
                chartListError = true;
            });
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

<style>
    :root {
        --themeFromJS: "black";
    }

    .chart-picker {
        border: 0;
        padding: 0;
    }

    .chart-picker legend {
        font-size: 1rem;
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

<h3>Add Chart</h3>
<form>
    <h4>Chart File</h4>

    <fieldset class="chart-picker">
        <legend>Select a Chart:</legend>
        {#if s3ChartTypes}
            <ChartTree
                nodes={chartTree}
                selected={chartAddForm.bracketSelected || ""}
                onSelect={handleChartSelect}
            />
        {:else if chartListError}
            <p role="alert">Unable to load the list of charts.</p>
        {:else}
            <p>Loading charts...</p>
        {/if}
    </fieldset>
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
        <label for="automated">Automated</label>

        <input
            id="manual"
            name="namingToolEnabled"
            type="radio"
            bind:group={namingToolEnabled}
            value={false}
        />
        <label for="manual">Manual</label>
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
            <label for="sat">Sat</label>

            <input
                id="sun"
                name="day"
                type="radio"
                bind:group={day}
                value="Sun"
            />
            <label for="sun">Sun</label>
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
            <label for="am">AM</label>

            <input
                id="pm"
                name="time"
                type="radio"
                bind:group={time}
                value="PM"
            />
            <label for="pm">PM</label>

            <input
                id="double"
                name="time"
                type="radio"
                bind:group={time}
                value="Double"
            />
            <label for="double">Double</label>

            <input
                id="single"
                name="time"
                type="radio"
                bind:group={time}
                value="Single"
            />
            <label for="single">Single</label>
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
            <label for="stock">Stock</label>

            <input
                id="ss"
                name="class"
                type="radio"
                bind:group={division}
                value="SS"
            />
            <label for="ss">SS</label>

            <input
                id="masters"
                name="class"
                type="radio"
                bind:group={division}
                value="Masters"
            />
            <label for="masters">Masters</label>

            <input
                id="legacy"
                name="class"
                type="radio"
                bind:group={division}
                value="Legacy"
            />
            <label for="legacy">Legacy</label>

            <input
                id="wrap"
                name="class"
                type="radio"
                bind:group={division}
                value="Wrap"
            />
            <label for="wrap">Wrap</label>
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
        onClick={handleSubmit}
        spinning={submitSpinning}
    >
        Add
    </SpinnerButton>
</form>
