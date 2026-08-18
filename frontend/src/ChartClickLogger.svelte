<script>
    import log from "loglevel";

    import { createPermissionStore } from "./routes/permissionStore.js";
    import { createEventDispatcher } from "svelte";

    import {
        chartClickLoggerId,
        chartClickLoggerShow,
        theme,
    } from "./stores.js";
    const RoutePermission = require("../../backend/modules/lambdaDerby/src/shared/RoutePermission.js");
    const canConfigureTimer = createPermissionStore(
        RoutePermission.CAN_TIMER_CONFIG
    );
    const dispatch = createEventDispatcher();
    const toggleEdit = async () => {
        log.debug("toggle:", editMode);
    };
    function toggleShow() {
        $chartClickLoggerShow = !$chartClickLoggerShow;
        if (!$chartClickLoggerShow) {
            $chartClickLoggerId = "";
        }
    }
    function copyJson() {
        dispatch("copyJson", {});
    }
</script>

<style>
    .fab {
        width: 1.5em;
        height: 1.5em;
        border-radius: 50%;
        box-shadow: 0 6px 10px 0 #666;
        transition: all 0.1s ease-in-out;

        font-size: 6vh;
        color: white;
        text-align: center;
        line-height: 1.5em;

        position: fixed;
        right: 25px;
        bottom: 80px;

        z-index: 99;
    }

    .fab:hover {
        box-shadow: 0 6px 14px 0 #666;
        transform: scale(1.05);
    }
</style>

<!-- @format -->
{#if $chartClickLoggerShow}
    <span style="position: absolute; z-index: 9; top:100px;left:0px;">
        <input
            id="cclInput"
            type="string"
            maxLength="7"
            size="7"
            bind:value={$chartClickLoggerId}
        />
        <p />
        <button on:click={copyJson}>Copy Json</button>
    </span>
{/if}
{#if $canConfigureTimer}
    <div class="fab" style="background-color: {$theme};" on:click={toggleShow}>
        {#if $chartClickLoggerShow}X{:else}E{/if}
    </div>
{/if}
