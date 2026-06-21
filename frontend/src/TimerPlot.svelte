<script>
    import log from "loglevel";
    import { onMount } from "svelte";
    import { querystring } from "svelte-spa-router";
    import { parse, toSeconds } from "iso8601-duration";
    import { tutorial as Timer } from "@rr1.us/timer_protobuf";
    import { axios, raceConfig, pushMessage } from "./stores.js";
    import { getTimerPbConfig, protobufLongToNumber } from "./utils.js";
    import TimerHistoryAge from "./TimerHistoryAge.svelte";

    export let points = [];
    export let width = 640;
    export let height = 220;
    export let xKey = "x";
    export let yKey = "y";
    export let label = "Timer Plot";
    export let metric = "cpuTempC";

    const searchParams = new URLSearchParams($querystring);
    const timerName = searchParams.get("timerName");
    const timerId = searchParams.get("timerId");
    const padding = {
        top: 18,
        right: 18,
        bottom: 28,
        left: 42,
    };
    let loading = false;
    let historyBeginAgeDuration = "PT20M";
    let historyEndAgeDuration = "PT0S";
    const metrics = [
        {
            value: "cpuTempC",
            label: "CPU Temp",
            yKey: "cpuTempC",
            title: "CPU Temp C",
        },
        {
            value: "cpuUptime",
            label: "CPU Uptime",
            yKey: "cpuUptime",
            title: "CPU Uptime Seconds",
        },
        {
            value: "wifiRss",
            label: "RSS",
            yKey: "wifiRss",
            title: "RSS",
        },
    ];

    $: plotWidth = Math.max(width - padding.left - padding.right, 1);
    $: plotHeight = Math.max(height - padding.top - padding.bottom, 1);
    $: selectedMetric =
        metrics.find((candidate) => candidate.value === metric) || metrics[0];
    $: activeYKey = yKey === "y" ? selectedMetric.yKey : yKey;
    $: numericPoints = points
        .map((point, index) => ({
            x: Number(point[xKey] ?? index),
            y: Number(point[activeYKey]),
        }))
        .filter((point) => !Number.isNaN(point.x) && !Number.isNaN(point.y));
    $: xMin = getMin(numericPoints, "x");
    $: xMax = getMax(numericPoints, "x");
    $: yMin = getMin(numericPoints, "y");
    $: yMax = getMax(numericPoints, "y");
    $: pathData = buildPath(numericPoints);
    $: rebootPoints = getRebootPoints(points);
    $: title = timerName
        ? `${selectedMetric.title} [${timerName}]`
        : label === "Timer Plot"
        ? selectedMetric.title
        : label;

    onMount(async () => {
        if (!points.length && timerName) {
            await loadCpuTempHistory();
        }
    });

    async function loadCpuTempHistory() {
        loading = true;
        try {
            const [timerPbConfig] = await getTimerPbConfig(timerName);
            const timerMqttClientId =
                timerPbConfig.timerMqttClientId || timerId || timerName;
            const beginSeconds = toSeconds(
                parse(historyBeginAgeDuration.toUpperCase())
            );
            const endSeconds = toSeconds(
                parse(historyEndAgeDuration.toUpperCase())
            );
            const loIso = new Date(Date.now() - beginSeconds * 1000).toISOString();
            const hiIso = new Date(Date.now() - endSeconds * 1000).toISOString();
            const response = await $axios.get(
                `${$raceConfig.baseUrl}/getTimerPbHistory`,
                {
                    params: {
                        orgIz: $raceConfig.orgIz,
                        orgId: $raceConfig.orgId,
                        timerName: timerMqttClientId,
                        loIso,
                        hiIso,
                    },
                }
            );

            points = buildCpuTempPoints(response.data);
        } catch (err) {
            log.error("timerPlot loadCpuTempHistory error:", err);
            pushMessage({
                text: "timerPlot failed: " + err,
                type: "error",
            });
        } finally {
            loading = false;
        }
    }

    function buildCpuTempPoints(historyList) {
        const cpuPoints = [];
        if (!historyList) return cpuPoints;

        for (let h of historyList) {
            if (!h || !h.data64 || h.SK.startsWith("9999:")) {
                continue;
            }

            const buf8 = Buffer.from(h.data64, "base64");
            const timerDataList = Timer.TimerDataList.decode(buf8);
            const xmitMs = protobufLongToNumber(timerDataList.xmitMs);
            for (let td of timerDataList.timerData) {
                if (
                    td.timerHealth &&
                    (undefined !== td.timerHealth.cpuTempC ||
                        undefined !== td.timerHealth.cpuUptime ||
                        undefined !== td.timerHealth.wifiRss)
                ) {
                    cpuPoints.push({
                        x: xmitMs,
                        cpuTempC: td.timerHealth.cpuTempC,
                        cpuUptime: td.timerHealth.cpuUptime,
                        wifiRss: td.timerHealth.wifiRss,
                    });
                }
            }
        }

        return cpuPoints
            .filter((point) => point.x && !Number.isNaN(point.y))
            .sort((a, b) => a.x - b.x);
    }

    function getRebootPoints(list) {
        const sortedPoints = list
            .filter(
                (point) =>
                    !Number.isNaN(Number(point[xKey])) &&
                    !Number.isNaN(Number(point.cpuUptime))
            )
            .sort((a, b) => Number(a[xKey]) - Number(b[xKey]));

        return sortedPoints.filter((point, index) => {
            if (index === 0) return false;
            const priorUptime = Number(sortedPoints[index - 1].cpuUptime);
            const uptime = Number(point.cpuUptime);
            return (
                uptime < priorUptime &&
                Number(point[xKey]) >= xMin &&
                Number(point[xKey]) <= xMax
            );
        });
    }

    function getMin(list, key) {
        if (!list.length) return 0;
        return Math.min(...list.map((point) => point[key]));
    }

    function getMax(list, key) {
        if (!list.length) return 1;
        return Math.max(...list.map((point) => point[key]));
    }

    function scale(value, min, max, size) {
        if (max === min) return size / 2;
        return ((value - min) / (max - min)) * size;
    }

    function plotX(point) {
        return padding.left + scale(point.x, xMin, xMax, plotWidth);
    }

    function plotY(point) {
        return padding.top + plotHeight - scale(point.y, yMin, yMax, plotHeight);
    }

    function buildPath(list) {
        return list
            .map((point, index) => {
                const command = index === 0 ? "M" : "L";
                return `${command} ${plotX(point)} ${plotY(point)}`;
            })
            .join(" ");
    }

    function fmtAxis(value) {
        if (value > 1000000000000) {
            return new Date(value).toLocaleTimeString();
        }
        return value;
    }
</script>

<style>
    .timerPlot {
        width: 100%;
        max-width: 100%;
    }

    .plotFrame {
        fill: #f8f9fa;
        stroke: #bbb;
    }

    .axis {
        stroke: #555;
        stroke-width: 1;
    }

    .series {
        fill: none;
        stroke: #1f77b4;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 2;
    }

    .rebootMarker {
        stroke: #d62728;
        stroke-width: 2;
    }

    .emptyText,
    .labelText,
    .rangeText {
        fill: #333;
        font-family: sans-serif;
    }

    .labelText {
        font-size: 14px;
        font-weight: 600;
    }

    .rangeText,
    .emptyText {
        font-size: 12px;
    }

    .plotControls {
        margin-bottom: 0.5rem;
    }

    .metricSelect {
        max-width: 14rem;
    }
</style>

<div class="plotControls">
    <select class="form-control metricSelect" bind:value={metric}>
        {#each metrics as option}
            <option value={option.value}>{option.label}</option>
        {/each}
    </select>
    <TimerHistoryAge
        bind:beginAgeDuration={historyBeginAgeDuration}
        bind:endAgeDuration={historyEndAgeDuration}
        spinning={loading}
        on:refresh={loadCpuTempHistory}
    />
</div>

<svg
    class="timerPlot"
    viewBox={`0 0 ${width} ${height}`}
    role="img"
    aria-label={title}
>
    <rect class="plotFrame" x="0" y="0" width={width} height={height} />
    <text class="labelText" x={padding.left} y="16">{title}</text>

    <line
        class="axis"
        x1={padding.left}
        y1={padding.top + plotHeight}
        x2={padding.left + plotWidth}
        y2={padding.top + plotHeight}
    />
    <line
        class="axis"
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={padding.top + plotHeight}
    />

    {#if loading}
        <text class="emptyText" x={padding.left} y={padding.top + 32}>
            Loading timer data
        </text>
    {:else if numericPoints.length > 1}
        {#each rebootPoints as rebootPoint}
            <line
                class="rebootMarker"
                x1={plotX(rebootPoint)}
                y1={padding.top}
                x2={plotX(rebootPoint)}
                y2={padding.top + plotHeight}
            />
        {/each}
        <path class="series" d={pathData} />
        <text class="rangeText" x={padding.left} y={height - 8}>
            {fmtAxis(xMin)} - {fmtAxis(xMax)}
        </text>
        <text class="rangeText" x="6" y={padding.top + 12}>{yMax}</text>
        <text class="rangeText" x="6" y={padding.top + plotHeight}>{yMin}</text>
    {:else}
        <text class="emptyText" x={padding.left} y={padding.top + 32}>
            No timer data
        </text>
    {/if}
</svg>
