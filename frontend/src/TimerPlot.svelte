<script context="module">
    let chartJsPromise;

    function loadChartJs() {
        if (!chartJsPromise) {
            chartJsPromise = import(
                /* webpackIgnore: true */ "https://cdn.jsdelivr.net/npm/chart.js@4.4.9/auto/+esm"
            ).then((module) => module.default || module.Chart);
        }
        return chartJsPromise;
    }
</script>

<script>
    import log from "loglevel";
    import { onDestroy, onMount } from "svelte";
    import { querystring } from "svelte-spa-router";
    import { parse, toSeconds } from "iso8601-duration";
    import { tutorial as Timer } from "@rr1.us/timer_protobuf";
    import { axios, raceConfig, pushMessage } from "./stores.js";
    import { getTimerPbConfig, protobufLongToNumber } from "./utils.js";
    import TimerHistoryAge from "./TimerHistoryAge.svelte";

    export let points = [];
    export let height = 320;
    export let xKey = "x";
    export let yKey = "y";
    export let label = "Timer Plot";
    export let metric = "cpuTempC";

    const searchParams = new URLSearchParams($querystring);
    const timerName = searchParams.get("timerName");
    const timerId = searchParams.get("timerId");
    let loading = false;
    let chartLoading = true;
    let chartError = "";
    let chartCanvas;
    let chart;
    let ChartLib;
    let historyBeginAgeDuration = "PT20M";
    let historyEndAgeDuration = "PT0S";

    const metrics = [
        {
            value: "cpuTempC",
            label: "CPU Temp (C)",
            yKey: "cpuTempC",
            title: "CPU Temp",
            unit: "C",
        },
        {
            value: "cpuTempF",
            label: "CPU Temp (F)",
            yKey: "cpuTempF",
            title: "CPU Temp",
            unit: "F",
        },
        {
            value: "cpuUptime",
            label: "CPU Uptime",
            yKey: "cpuUptime",
            title: "CPU Uptime",
            unit: "sec",
        },
        {
            value: "wifiRss",
            label: "RSS",
            yKey: "wifiRss",
            title: "RSS",
            unit: "dBm",
        },
        {
            value: "mqttConnections",
            label: "MQTT Conn",
            yKey: "mqttConnections",
            title: "MQTT Connections",
            unit: "count",
        },
        {
            value: "mqttLatency",
            label: "MQTT Latency",
            yKey: "mqttLatency",
            title: "MQTT Latency",
            unit: "ms",
        },
    ];

    const rebootMarkerPlugin = {
        id: "rebootMarkers",
        afterDatasetsDraw(chart, args, pluginOptions) {
            const markers = pluginOptions.markers || [];
            const xScale = chart.scales.x;
            const chartArea = chart.chartArea;
            const ctx = chart.ctx;

            ctx.save();
            ctx.strokeStyle = "#d62728";
            ctx.lineWidth = 2;
            markers.forEach((marker) => {
                const x = xScale.getPixelForValue(marker[xKey]);
                if (x < chartArea.left || x > chartArea.right) {
                    return;
                }
                ctx.beginPath();
                ctx.moveTo(x, chartArea.top);
                ctx.lineTo(x, chartArea.bottom);
                ctx.stroke();
            });
            ctx.restore();
        },
    };

    $: selectedMetric =
        metrics.find((candidate) => candidate.value === metric) || metrics[0];
    $: activeYKey = yKey === "y" ? selectedMetric.yKey : yKey;
    $: numericPoints = points
        .map((point, index) => ({
            x: Number(point[xKey] ?? index),
            y: Number(point[activeYKey]),
        }))
        .filter((point) => !Number.isNaN(point.x) && !Number.isNaN(point.y));
    $: rebootPoints = getRebootPoints(points);
    $: title = timerName
        ? `${selectedMetric.title} (${selectedMetric.unit}) [${timerName}]`
        : label === "Timer Plot"
          ? `${selectedMetric.title} (${selectedMetric.unit})`
          : label;
    $: if (ChartLib && chartCanvas) {
        renderChart(numericPoints, rebootPoints, title, selectedMetric);
    }

    onMount(async () => {
        try {
            ChartLib = await loadChartJs();
            ChartLib.register(rebootMarkerPlugin);
            chartLoading = false;
            if (!points.length && timerName) {
                await loadCpuTempHistory();
            } else {
                renderChart(numericPoints, rebootPoints, title, selectedMetric);
            }
        } catch (err) {
            chartLoading = false;
            chartError = "Unable to load Chart.js.";
            log.error("timerPlot Chart.js load error:", err);
            pushMessage({
                text: chartError,
                type: "error",
            });
        }
    });

    onDestroy(() => {
        if (chart) {
            chart.destroy();
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
            const loIso = new Date(
                Date.now() - beginSeconds * 1000
            ).toISOString();
            const hiIso = new Date(
                Date.now() - endSeconds * 1000
            ).toISOString();
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

    function renderChart(
        chartPoints,
        chartRebootPoints,
        chartTitle,
        chartMetric
    ) {
        if (!ChartLib || !chartCanvas) {
            return;
        }

        const config = {
            type: "line",
            data: {
                datasets: [
                    {
                        label: `${chartMetric.label} (${chartMetric.unit})`,
                        data: chartPoints,
                        borderColor: "#1f77b4",
                        backgroundColor: "rgba(31, 119, 180, 0.12)",
                        borderWidth: 2,
                        pointRadius: chartPoints.length > 80 ? 0 : 2,
                        tension: 0.15,
                    },
                ],
            },
            options: {
                animation: false,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                    },
                    rebootMarkers: {
                        markers: chartRebootPoints,
                    },
                    title: {
                        display: true,
                        text: chartTitle,
                    },
                    tooltip: {
                        callbacks: {
                            title(items) {
                                if (!items.length) return "";
                                return fmtAxisTooltip(items[0].parsed.x);
                            },
                            label(item) {
                                return `${chartMetric.label}: ${fmtMetric(
                                    item.parsed.y,
                                    chartMetric
                                )}`;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        type: "linear",
                        title: {
                            display: true,
                            text: "Local Time",
                        },
                        ticks: {
                            maxTicksLimit: 6,
                            callback(value) {
                                return fmtAxis(value);
                            },
                        },
                    },
                    y: {
                        title: {
                            display: true,
                            text: `${chartMetric.title} (${chartMetric.unit})`,
                        },
                        ticks: {
                            callback(value) {
                                return fmtMetric(value, chartMetric);
                            },
                        },
                    },
                },
            },
        };

        if (chart) {
            chart.data = config.data;
            chart.options = config.options;
            chart.update();
        } else {
            chart = new ChartLib(chartCanvas, config);
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
            const prevPubAckMs = protobufLongToNumber(
                timerDataList.prevPubAckMs
            );
            for (let td of timerDataList.timerData) {
                if (
                    td.timerHealth &&
                    (undefined !== td.timerHealth.cpuTempC ||
                        undefined !== td.timerHealth.cpuUptime ||
                        undefined !== td.timerHealth.wifiRss ||
                        undefined !== td.timerHealth.mqttConnections ||
                        undefined !== prevPubAckMs)
                ) {
                    cpuPoints.push({
                        x: xmitMs,
                        cpuTempC: td.timerHealth.cpuTempC,
                        cpuTempF: celsiusToFahrenheit(td.timerHealth.cpuTempC),
                        cpuUptime: td.timerHealth.cpuUptime,
                        wifiRss: td.timerHealth.wifiRss,
                        mqttConnections: td.timerHealth.mqttConnections,
                        mqttLatency: prevPubAckMs,
                    });
                }
            }
        }

        return cpuPoints
            .filter(
                (point) =>
                    point.x &&
                    metrics.some(
                        (candidate) =>
                            !Number.isNaN(Number(point[candidate.yKey]))
                    )
            )
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
            return uptime < priorUptime;
        });
    }

    function fmtAxis(value) {
        if (value > 1000000000000) {
            return new Date(value).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
            });
        }
        return value;
    }

    function fmtAxisTooltip(value) {
        if (value > 1000000000000) {
            return new Date(value).toLocaleString([], {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
                timeZoneName: "short",
            });
        }
        return value;
    }

    function fmtValue(value) {
        if (Math.abs(value) >= 100) {
            return Math.round(value);
        }
        return Math.round(value * 10) / 10;
    }

    function fmtMetric(value, chartMetric = selectedMetric) {
        return `${fmtValue(value)} ${chartMetric.unit}`;
    }

    function celsiusToFahrenheit(value) {
        if (undefined === value || null === value) {
            return undefined;
        }
        return (9 / 5) * value + 32;
    }
</script>

{#if timerName || timerId}
    <div class="timerHeader">
        {#if timerName}
            <span class="timerName">{timerName}</span>
        {/if}
        {#if timerId}
            <span class="timerId">{timerId}</span>
        {/if}
    </div>
{/if}

<div class="plotControls">
    <select class="form-control metricSelect" bind:value={metric}>
        {#each metrics as option}
            <option value={option.value}>{option.label}</option>
        {/each}
    </select>
    <TimerHistoryAge
        bind:beginAgeDuration={historyBeginAgeDuration}
        bind:endAgeDuration={historyEndAgeDuration}
        spinning={loading || chartLoading}
        on:refresh={loadCpuTempHistory}
    />
</div>

{#if chartError}
    <div class="chartMessage">{chartError}</div>
{:else if chartLoading}
    <div class="chartMessage">Loading Chart.js</div>
{:else if loading}
    <div class="chartMessage">Loading timer data</div>
{/if}

<div class="chartShell" style={`height: ${height}px;`}>
    <canvas bind:this={chartCanvas} aria-label={title} />
</div>
<div class="chartLegend">
    <span class="legendItem">
        <span class="lineSample" />
        {selectedMetric.label} ({selectedMetric.unit})
    </span>
    <span class="legendItem">
        <span class="rebootSample" />
        Reboot
    </span>
    <span>Samples: {numericPoints.length}</span>
</div>

<style>
    .plotControls {
        margin-bottom: 0.5rem;
    }

    .timerHeader {
        align-items: baseline;
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem 1rem;
        margin-bottom: 0.5rem;
    }

    .timerName {
        font-size: 1.25rem;
        font-weight: 600;
    }

    .timerId {
        color: #555;
        font-size: 0.95rem;
    }

    .metricSelect {
        max-width: 14rem;
    }

    .chartShell {
        height: 320px;
        min-height: 220px;
        position: relative;
        width: 100%;
    }

    .chartMessage {
        color: #333;
        padding: 1rem 0;
    }

    .chartLegend {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        margin-top: 0.5rem;
    }

    .legendItem {
        align-items: center;
        display: inline-flex;
        gap: 0.35rem;
    }

    .lineSample {
        background: #1f77b4;
        display: inline-block;
        height: 2px;
        width: 1.5rem;
    }

    .rebootSample {
        background: #d62728;
        display: inline-block;
        height: 1.25rem;
        width: 2px;
    }
</style>
