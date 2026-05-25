<script>
    import log from "loglevel";
    import { Card, CardBody, CardHeader, CardTitle, Badge } from "sveltestrap";

    import { faEdit } from "@fortawesome/free-solid-svg-icons/faEdit";
    import { faDice } from "@fortawesome/free-solid-svg-icons/faDice";
    import Icon from "fa-svelte";

    import { driverMap, doRefreshBlocks } from "./stores.js";
    import MaterialAdd from "./MaterialAdd.svelte";
    import { safeGetAt } from "./utils.js";
    import { db } from "./eventDb.js";
    import { onMount } from "svelte";
    import { push, pop, replace } from "svelte-spa-router";
    import { isEmailAllowedRoutePath } from "./utils.js";
    import { userEmail } from "./stores.js";
    import SpinnerButton from "./SpinnerButton.svelte";

    var userHasPermission = false;

    var currentViewMode = undefined;

    $: {
        refreshDataFromDb($doRefreshBlocks);
    }
    var bmdFromDexie = [{ bracketName: "Initializing..." }];

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
        currentViewMode = "Active";
    };
    const getBmdAsList = (driverMap) => {
        const rc = [];
        db.BracketMetaData.each((bmd) => {
            (log.debug("bmd from dexie: ", bmd), rc.push(bmd));
        });

        log.debug("bmd rc:", rc);
        return rc;
        //const bmdArray= db.BracketMetaData.toArray();
        //log.debug("bmdArray:",bmdArray)
        //return bmdArray;
    };
    const navToChartDetail = (bmd) => {
        push("/ChartDetail/" + bmd.SK);
    };
    function getSortedBmd(bmdFromDexie) {
        bmdFromDexie.sort((a, b) => {
            return a.bracketName
                .toLowerCase()
                .localeCompare(b.bracketName.toLowerCase());
        });

        return bmdFromDexie;
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

<style>
    div :global(.xLargeEdit) {
        font-size: 28px;
    }
</style>

<div>
    <h4>Chart List</h4>
    <p />
    <MaterialAdd clickHandleRoute="/chartAdd" />

    {#each getSortedBmd(bmdFromDexie) as bmd (bmd.at)}
        {#if shouldDisplay(bmd)}
            <Card
                class="mt-3 border border-info"
                on:click={() => navToChartDetail(bmd)}
            >
                <CardBody>
                    <div style="display: inline">{bmd.bracketName}</div>

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
