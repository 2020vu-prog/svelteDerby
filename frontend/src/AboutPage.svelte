<script>
    import log from "loglevel";

    import {
        doRefreshBlocks,
        theme,
        showBottomNav,
        developerMode,
        developerLogging,
        enableFractionalMs,
        pushMessage,
    } from "./stores.js";
    $: {
        document.documentElement.style.setProperty(
            `--themeFromJS`,
            `${$theme}`
        );
    }

    import {
        buildVersion,
        buildDate,
        buildGitBranch,
        buildGitHash,
        buildGitDirty,
        formatBuildEpoch,
        isEmailAllowedRoutePath,
    } from "./utils.js";

    import { onMount } from "svelte";
    import {
        getCacheKey,
        setCacheKey,
        userEmail,
        axios,
        raceConfig,
    } from "./stores.js";
    import { db, localConfigDb } from "./eventDb.js";
    import BottomNav from "./BottomNav.svelte";
    import OrgName from "./OrgName.svelte";

    import { faEdit } from "@fortawesome/free-solid-svg-icons/faEdit";
    import Icon from "fa-svelte";
    import { push } from "svelte-spa-router";

    let mounted = false;

    var ecFromDexie;
    var histCountFromDexie = "";
    var derbyMainVersionInfo = {};
    const formatGitInfo = (branch, hash, dirty) =>
        [branch, hash, dirty === "dirty" ? dirty : ""]
            .filter((part) => part)
            .join(" / ");
    const gitDirty = buildGitDirty();
    const gitInfo = formatGitInfo(buildGitBranch(), buildGitHash(), gitDirty);
    const getGitBreadcrumb = (breadcrumb) => {
        if (!breadcrumb) {
            return {};
        }
        try {
            return JSON.parse(breadcrumb);
        } catch (err) {
            return {};
        }
    };
    $: backendGitBreadcrumb = getGitBreadcrumb(
        derbyMainVersionInfo.gitBreadcrumb
    );

    const refreshDataFromDb = async (trigger) => {
        log.warn("refreshDataFromDb data:", trigger);

        ecFromDexie = await db.EventConfig.toArray();
        histCountFromDexie = (await db.EventHistory.count()).toString();
    };

    const refreshDerbyMainVersionInfo = async () => {
        try {
            const cacheKey = getCacheKey();
            const response = await $axios.get(
                `${$raceConfig.baseUrl}/getDerbyMainVersion`,
                { params: { cache: cacheKey } }
            );
            derbyMainVersionInfo = response.data || {};
        } catch (err) {
            log.warn("refreshDerbyMainVersionInfo failed:", err);
            derbyMainVersionInfo = {};
        }
    };
    $: {
        refreshDataFromDb($doRefreshBlocks);
    }

    onMount(async () => {
        log.warn("mounting");

        mounted = true;
        refreshDataFromDb();
        refreshDerbyMainVersionInfo();
    });

    var devClickCount = 0;
    function devClick() {
        if ($developerMode && devClickCount < 8) {
            pushMessage( {
                text: `You are already a developer.`,
                type: "success",
            });
            return;
        }
        if (devClickCount++ > 8) {
            log.warn("devmodeA");
            $developerMode = true;
            pushMessage( {
                text: `Developer Mode Enabled.`,
                type: "success",
            });
        }
    }

    function isManualTimerAllowed() {
        return isEmailAllowedRoutePath($userEmail, "/ManualTimerAdd");
    }

    function isEventEditAllowed() {
        return isEmailAllowedRoutePath($userEmail, "/eventAdd/db/Update");
    }
</script>

<style>
    :root {
        --themeFromJS: "black";
    }

    /* https://stackoverflow.com/questions/3779534/how-do-i-disable-text-selection-with-css-or-javascript */
    .noselect {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
    }

    div.singularSettingDiv {
        display: inline;
    }

    h4 {
        display: inline;
    }

    hr {
        border: 1px solid var(--themeFromJS);
    }

    input[type="checkbox"] {
        transform: scale(2);
        float: right;
        margin-right: 10px;
    }

    div :global(.xLargeEdit) {
        font-size: 28px;
        float: right;
        margin-right: 10px;
    }
</style>

<div class="settings">
    <h1>About</h1>
    <hr />

    {#if ecFromDexie && ecFromDexie[0]}
        <br />
        <h2>Event Info</h2>
        <hr />

        <div class="singularSettingDiv">
            <h4>Event Name / Org Name</h4>
            {#if isEventEditAllowed($userEmail)}
            <span
                on:click={(event) => {
                    push(`/eventAdd/db/Update`);
                    event.stopPropagation();
                }}
            >
            <Icon class="xLargeEdit" icon={faEdit} />
            </span>
            {/if}
            <h6>
                <span>{ecFromDexie[0].name}</span>
                /
                <OrgName orgIz={ecFromDexie[0].orgIz} />
                [{ecFromDexie[0].orgIz}]
            </h6>
        </div>
        <hr />

        <div class="singularSettingDiv">
            <h4>Archive Details</h4>
            <h6>
                <span>
                    This event will archive at: {new Date(
                        ecFromDexie[0].TTL * 1000
                    ).toLocaleString()}
                </span>
            </h6>
        </div>
        <hr />
    {/if}

    {#if histCountFromDexie}
        <div class="singularSettingDiv">
            <h4>DB Count</h4>
            <h6>This event contains {histCountFromDexie} database updates.</h6>
        </div>
        <hr />
    {/if}

    <br />
    <h2>Version Info</h2>
    <hr />

    <div class="singularSettingDiv">
        <h4>Frontend</h4>
        <h6>
            <span class="noselect" on:click={devClick}>
                Build Version: {buildVersion()}<br />
                Build Date: {buildDate()}<br />
                Git: {gitInfo}
            </span>
        </h6>
    </div>
    <hr />

    <div class="singularSettingDiv">
        <h4>Backend DerbyMain</h4>
        <h6>
            Version: {derbyMainVersionInfo.version || "unknown"}<br />
            Build Date: {formatBuildEpoch(
                backendGitBreadcrumb.buildTime,
                "unknown"
            )}<br />
            Git: {formatGitInfo(
                backendGitBreadcrumb.branch,
                backendGitBreadcrumb.hash,
                backendGitBreadcrumb.dirty
            ) || "unknown"}
        </h6>
    </div>
    <hr />

    <br />
    {#if $developerMode}
        <h2>Developer Info</h2>
        <hr />
        <div class="singularSettingDiv">
            <h4>Developer Logs</h4>
            <input type="checkbox" bind:checked={$developerLogging} />
            <h6>
                This toggles whether the developer logs are emitted on
                <strong>all screens</strong>.
            </h6>
        </div>
        {#if isManualTimerAllowed($userEmail)}
        <hr />
        <div class="singularSettingDiv">
            <h4>Allow Fractional MS timing</h4>
            <input type="checkbox" bind:checked={$enableFractionalMs} />
            <h6>
                This enables partial MS entry on manual timer. <strong>NOT recommended</strong>.
            </h6>
        </div>
        {/if}
    {/if}

    <BottomNav />
</div>
