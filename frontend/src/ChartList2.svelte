<script>
    import log from "loglevel";
    import { Card, CardBody, CardHeader, CardTitle, Badge } from "sveltestrap";

    import { faEdit } from "@fortawesome/free-solid-svg-icons/faEdit";
    import { faDice } from "@fortawesome/free-solid-svg-icons/faDice";
    import Icon from "fa-svelte";
    import { theme } from "./stores.js";

    import { driverMap, doRefreshBlocks } from "./stores.js";
    import MaterialAdd from "./MaterialAdd.svelte";
    import { safeGetAt, getChartJson } from "./utils.js";
    import { db } from "./eventDb.js";
    import { onMount } from "svelte";
    import { push, pop, replace } from "svelte-spa-router";
    import { isEmailAllowedRoutePath } from "./utils.js";
    import { userEmail, standingsMap } from "./stores.js";
    import SpinnerButton from "./SpinnerButton.svelte";

    var userHasPermission = false;

    var currentViewMode = undefined;

    $: {
        refreshDataFromDb($doRefreshBlocks);
    }
    var bmdFromDexie = [{ bracketName: "Initializing..." }];

    var currentShowingStat = "Phases";

    onMount(async () => {
        refreshDataFromDb();
        userHasPermission = await isEmailAllowedRoutePath(
            $userEmail,
            "/chartAdd"
        );
    });
    const refreshDataFromDb = async (trigger) => {
        log.debug("refreshDataFromDb data:", trigger);

        bmdFromDexie = await db.BracketMetaData.toArray();
        getSortedBmd();
        currentViewMode = "Active";
    };

    const navToChartDetail = (bmd) => {
        push("/ChartDetail/" + bmd.SK);
        //push("/ChartDetailCardList/" + bmd.SK);
    };
    async function getSortedBmd() {
        bmdFromDexie = await updateBmds();

        bmdFromDexie.sort((a, b) => {
            var rc =
                (a.cp > 0 ? a.cp / a.tp : 0.999) -
                (b.cp > 0 ? b.cp / b.tp : 0.999);
            if (rc === 0) {
                return a.bracketName
                    .toLowerCase()
                    .localeCompare(b.bracketName.toLowerCase());
            } else {
                return rc;
            }
        });
    }

    var showExplanation = false;
    async function updateBmds() {
        var updatedBmds = [];
        var rsListFromDexie = await db.RaceStanding.toArray();
        var bpListFromDexie = await db.BracketPos.toArray();

        //Don't show asterisk paragraph by default.
        showExplanation = false;

        for (var bmd of bmdFromDexie) {
            if (bmd && bmd.jsonPath) {
                var chartJson = await getChartJson(bmd);
                if (!chartJson) {
                    log.debug("ChartList2 updateBmds missing chart json:", bmd);
                    updatedBmds.push(bmd);
                    continue;
                }

                //Fetch # of heats that need to be run from chartJson
                var totalHeats = Object.keys(chartJson.progress).length;

                //Subtract 1 heat from the total for any heats in the chartJson that have if statements in their WinnerDest positions. (i.e. championship runoffs)
                var runoffs = Object.values(chartJson.progress).filter((a) => {
                    return a.WinnerDest.split("(").length > 1;
                });

                if (runoffs.length > 0) {
                    var secondaryRunoffHeatNum =
                        runoffs[0].WinnerDest.split(":")[1].split(/[A-Z]/)[0];

                    var secondaryRunoffbpFromDexie = bpListFromDexie.filter(
                        (a) => {
                            return (
                                a.SK == `${bmd.SK}:${secondaryRunoffHeatNum}`
                            );
                        }
                    )[0];

                    //Only subtract phases for extra runoff if it's not going to be used.
                    if (
                        secondaryRunoffbpFromDexie &&
                        secondaryRunoffbpFromDexie.pos &&
                        secondaryRunoffbpFromDexie.pos.A &&
                        secondaryRunoffbpFromDexie.pos.A.ptcp
                    ) {
                    } else {
                        totalHeats--;
                        bmd.extraHeat = true;
                    }
                }

                var totalPhases = totalHeats * 2;

                var completedHeats = 0;
                var completedPhases = 0;

                Object.keys(chartJson.progress).forEach(function (heatNum) {
                    var rsFromDexie = rsListFromDexie.filter((a) => {
                        return a.SK == `${bmd.SK}:${heatNum}`;
                    })[0];

                    //Check if a raceStanding exists for each heat in the chartJson
                    if (rsFromDexie && !rsFromDexie.del) {
                        if (rsFromDexie.ph1) {
                            completedPhases++;
                        }
                        if (rsFromDexie.ph2) {
                            completedPhases++;
                            completedHeats++;
                        }
                    } else {
                        //If a raceStanding does not exist, check to see if that race bracketPosition contains a bye/forfeit

                        var bp = bpListFromDexie.filter((a) => {
                            return a.SK == `${bmd.SK}:${heatNum}`;
                        })[0];
                        if (bp && bp.pos) {
                            var accountedFor = false;
                            ["A", "B"].forEach(function (pos) {
                                if (bp.pos[pos] && !accountedFor) {
                                    if (
                                        bp.pos[pos].status == "bye" ||
                                        bp.pos[pos].status == "forfeit"
                                    ) {
                                        totalHeats--;
                                        totalPhases -= 2;
                                        accountedFor = true;
                                    }
                                }
                            });
                        }
                    }
                });

                //If runoffs are actually run, adjust the number of needed phases accordingly. This is to prevent, for example, "6/4 Phases Done."
                if (completedPhases && completedPhases > totalPhases) {
                    totalPhases += 2;
                    totalHeats += 1;
                }

                bmd.tp = totalPhases;
                bmd.th = totalHeats;

                if (completedPhases) {
                    bmd.ch = completedHeats;
                    bmd.cp = completedPhases;

                    bmd.completePhasePercent = (bmd.cp / bmd.tp) * 100;
                    bmd.completeHeatPercent = (bmd.ch / bmd.th) * 100;
                } else {
                    bmd.completePhasePercent = 0;
                    bmd.completeHeatPercent = 0;
                }

                if (runoffs && runoffs[0]) {
                    var runoffrsFromDexie = rsListFromDexie.filter((a) => {
                        return a.SK == `${bmd.SK}:${runoffs[0].HeatNumber}`;
                    })[0];
                    //Only show an asterisk if the heat that determines if a runoff is necessary is not complete.
                    if (
                        bmd.extraHeat &&
                        bmd.cp < bmd.tp &&
                        (!runoffrsFromDexie || !runoffrsFromDexie.ph2)
                    ) {
                        showExplanation = true;
                        bmd.showAsterisk = true;
                    }
                }
            }
            updatedBmds.push(bmd);
        }
        return updatedBmds;
    }
    function getInactiveMode(ignoredParamater) {
        bmdFromDexie = bmdFromDexie;
        return currentViewMode === "Active" ? "Hidden" : "Active";
    }
    function shouldDisplay(bmd) {
        return (
            (currentViewMode == "Active" && !bmd.del) ||
            (currentViewMode == "Hidden" && bmd.del)
        );
    }
</script>

<div>
    <h4>Chart List</h4>
    <p />
    <MaterialAdd clickHandleRoute="/chartAdd" />

    {#each bmdFromDexie as bmd (bmd.at)}
        {#if shouldDisplay(bmd)}
            <Card class="mt-3 border border-info">
                <CardBody style="padding: 0">
                    <div on:click={() => navToChartDetail(bmd)}>
                        <div
                            style="display: flex; align-items: center;
                            justify-content: center; text-align: center"
                        >
                            <h3 style="display: inline; margin: 0">
                                {bmd.bracketName}
                            </h3>
                            &nbsp;&nbsp;
                            <img
                                width="24"
                                height="24"
                                src="up-right-arrow.svg"
                            />
                        </div>

                        {#if userHasPermission}
                            <span style="display: inline; float: right">
                                <span
                                    on:click={(event) => {
                                        push(`/ChartFill/${bmd.SK}`);
                                        event.stopPropagation();
                                    }}
                                >
                                    <Icon class="xLargeEdit" icon={faDice} />
                                </span>
                                &nbsp; &nbsp;
                                <span
                                    on:click={(event) => {
                                        push(`/ChartEdit/${bmd.SK}`);
                                        event.stopPropagation();
                                    }}
                                >
                                    <Icon class="xLargeEdit" icon={faEdit} />
                                </span>
                            </span>
                        {/if}

                        <br />
                    </div>
                </CardBody>
                <CardBody style="padding: 0">
                    <div
                        style="width: fill-parent; text-align:center; padding:
                        0.5px; background: linear-gradient(to right, {$theme}
                        {currentShowingStat == 'Phases'
                            ? bmd.completePhasePercent
                            : bmd.completeHeatPercent}%,
                        transparent 0), linear-gradient(to left, lightgray {100 -
                            (currentShowingStat == 'Phases'
                                ? bmd.completePhasePercent
                                : bmd.completeHeatPercent)}%,
                        transparent 0)"
                        on:click={(event) => {
                            currentShowingStat == "Heats"
                                ? (currentShowingStat = "Phases")
                                : (currentShowingStat = "Heats");
                            event.stopPropagation();
                        }}
                    >
                        <span style="color: white">
                            {#if !bmd.cp || bmd.cp == 0}
                                0 {currentShowingStat} Done
                            {:else if bmd.cp == bmd.tp}
                                {currentShowingStat == "Heats"
                                    ? bmd.ch
                                    : bmd.cp}
                                {currentShowingStat} Done
                            {:else if currentShowingStat == "Heats"}
                                {bmd.ch}/{bmd.th}{bmd.showAsterisk ? "*" : ""}
                                Heats Done
                            {:else}
                                {bmd.cp}/{bmd.tp}{bmd.showAsterisk ? "*" : ""}
                                Phases Done
                            {/if}
                        </span>
                    </div>
                </CardBody>
            </Card>
        {/if}
    {/each}
</div>
<br />
<br />

{#if userHasPermission}
    <SpinnerButton on:click={() => (currentViewMode = getInactiveMode())}>
        View {getInactiveMode(currentViewMode)} Charts
    </SpinnerButton>
{/if}

{#if showExplanation}
    <hr />
    <p>
        *Double elimination charts often include a runoff if the winner of the
        consolation side defeats the winner of the winners side in the final
        round. Therefore, the asterisk indicates that an extra heat (2 phases)
        may be required.
    </p>
    {#if userHasPermission}
        <!--Allow enought room for the FAB underneath the asterisk explanation.-->
        <br />
        <br />
        <br />
        <br />
    {/if}
{/if}

<style>
    div :global(.xLargeEdit) {
        font-size: 28px;
    }
</style>
