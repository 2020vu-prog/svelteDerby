<script>
    import log from "loglevel";

    import SpinnerButton from "./SpinnerButton.svelte";
    import AuditBlocks from "./AuditBlocks.svelte";
    import {
        raceConfig,
        driverMap,
        pushMessage,
        nextOnBlockKey,
        axios,
        defaultPhaseType,
    } from "./stores.js";
    import { onMount, tick } from "svelte";
    import { push, pop, replace } from "svelte-spa-router";
    import {
        participantValid,
        participantFocusCompletion,
        getRaceTypeEmoji,
    } from "./utils.js";

    export let params = {};
    const mode = params.type;
    const modeRaceStanding = "RaceStanding";
    const modeRacePhase = "RacePhase";
    log.debug("RaceStandingAdd", params, mode);
    var mounted = false;
    var submitFocused = false;
    var submitDisabled = true;
    var submitSpinning = false;
    var blocksOccupied = true;
    let car1Input;
    let car2Input;
    const PhaseTypes = {
        R: { type: "Race" },
        T: { type: "Trial Run" },
        F: { type: "Fun Run" },
        H: { type: "Hot Run" },
        Y: { type: "Bye Run" },
        //H1: { type: "Lane1 Hot Run", disabledLane: 2 },
        //T1: { type: "Lane1 Trial Run", disabledLane: 2 },
        //F1: { type: "Lane1 Fun Run", disabledLane: 2 },
        //H2: { type: "Lane2 Hot Run", disabledLane: 1 },
        //T2: { type: "Lane2 Trial Run", disabledLane: 1 },
        //F2: { type: "Lane2 Fun Run", disabledLane: 1 },
    };
    let car1Disable = false;
    let car2Disable = false;
    const typeVars = {
        RaceStanding: {
            title: "Add Pending Race",
            endPoint: "/addPending",
            promptPhaseType: false,
        },
        RacePhase: {
            title: "Add Blocks",
            endPoint: "/addBlocks",
            promptPhaseType: true,
        },
    };
    var title = "abc";
    function isDefined(x) {
        const rc = typeof elem !== "null";
        //log.debug("isDefined:", x, typeof x,rc);
        return rc;
    }
    const unMapType = (feature) => {
        if (
            typeVars[params.type] &&
            isDefined(typeVars[params.type][feature])
        ) {
            return typeVars[params.type][feature];
        }
        log.warn("unMapType:missing map for ", params.type, feature);
        return "unknown";
    };
    onMount(async () => {
        log.debug("mounted type:", params.type);
        title = unMapType("title");
        await tick();
        car1Input?.focus();
        if (mode === modeRacePhase) {
            carNumberForm.promptPhaseType = $defaultPhaseType;
        }

        mounted = true;
    });
    function changeFocus(carNumber, seedIdentifier) {
        //log.debug("changeFocus ", seedIdentifier, " ", carNumber);
        if (participantFocusCompletion(carNumber)) {
            if (seedIdentifier == "A") {
                car2Input?.focus();
                syncAddButton(false);
            } else if (seedIdentifier == "B") {
                syncAddButton(true);
            }
        } else {
            syncAddButton(false);
        }
    }

    function conditionalCarNumber(inCn) {
        if (inCn) {
            return inCn;
        }
        return "";
    }

    $: {
        blocksOccupied = $nextOnBlockKey.length > 0;
    }

    async function handleSubmit() {
        const endPoint = unMapType("endPoint");

        if (endPoint == "/addBlocks" && blocksOccupied) {
            pushMessage({
                text: "You cannot add a race to the blocks when the blocks are already occupied.",
                type: "error",
            });
            return;
        }

        log.debug("Adding:" + JSON.stringify(carNumberForm));

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            cn: [
                conditionalCarNumber(carNumberForm.car1) + "",
                conditionalCarNumber(carNumberForm.car2) + "",
            ],
            pt: carNumberForm.promptPhaseType,
        };
        if (req.cn[0] === req.cn[1]) {
            pushMessage({
                text: `Car numbers must not match [${req.cn[0]}] [${req.cn[1]}]`,
                type: "error",
            });
            return;
        }

        //no double click
        if (submitSpinning) {
            return; // ignore possible double click (ui should have been disable, so this is a safety net)
        }
        submitSpinning = true;
        try {
            const response = await $axios.post(
                $raceConfig.baseUrl + endPoint,
                req
            );
            log.debug("add response", response);

            await sleep(10); // verify spinner
            pop();
        } catch (err) {
            log.debug("RSA axios err:", err);
        } finally {
            //re-enable
            submitSpinning = false;
        }

        //carNumberForm.car1 = "";
        //carNumberForm.car2 = "";
    }
    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    let carNumberForm = {};
    function syncAddButton(advanceFocusToSubmit) {
        if (!mounted) {
            return;
        }
        if (
            participantValid(carNumberForm.car1) &&
            participantValid(carNumberForm.car2)
        ) {
            //log.debug("sync add button SYNC");

            submitDisabled = false;
            if (advanceFocusToSubmit == true) {
                submitFocused = true;
            }
        } else {
            if (
                participantValid(carNumberForm.car1) ||
                participantValid(carNumberForm.car2)
            ) {
                submitDisabled = false; //trial/fun/hot run
            } else {
                submitDisabled = true;
            }
            //log.debug("sync add button FAIL");
        }
    }
    const getDriverName = (number) => {
        if (number && $driverMap[number]) {
            return $driverMap[number].name;
        } else {
            return "Unknown Racer";
        }
    };
    function potentialDisableCars() {
        //await tick();
        const ppt = carNumberForm.promptPhaseType;
        const ptMap = PhaseTypes[ppt];
        log.debug("potentialDisableCars", carNumberForm, ptMap);
        car1Disable = false;
        car2Disable = false;
        if (ptMap.disabledLane == 1) {
            car1Disable = true;
            carNumberForm.car1 = "";
        }
        if (ptMap.disabledLane == 2) {
            car2Disable = true;
            carNumberForm.car2 = "";
        }
        $defaultPhaseType = ppt;
    }
</script>

<h3>{title}</h3>

<form>
    {#if mode == modeRacePhase && !submitSpinning}
        <h4>
            Blocks are
            <strong
                style="background-color: {blocksOccupied
                    ? '#FF0000'
                    : 'lightgreen'}"
            >
                {blocksOccupied ? "OCCUPIED" : "EMPTY"}
            </strong>
        </h4>
    {/if}
    {#if unMapType("promptPhaseType")}
        <select
            bind:value={carNumberForm.promptPhaseType}
            on:change={() => potentialDisableCars()}
        >
            {#each Object.keys(PhaseTypes) as pt}
                <option value={pt}>
                    {getRaceTypeEmoji(pt)}
                    {PhaseTypes[pt].type}
                </option>
            {/each}
        </select>
        <p />
    {/if}
    <label>
        <input
            type="text"
            pattern="\d*"
            inputmode="numeric"
            bind:value={carNumberForm.car1}
            placeholder="Lane 1"
            id="cn1"
            bind:this={car1Input}
            on:keyup={() => {
                changeFocus(carNumberForm.car1, "A");
            }}
            disabled={car1Disable}
        />
        <p>{getDriverName(carNumberForm.car1)}</p>
    </label>

    <label>
        <input
            type="text"
            pattern="\d*"
            inputmode="numeric"
            bind:value={carNumberForm.car2}
            placeholder="Lane 2"
            id="cn2"
            bind:this={car2Input}
            on:keyup={() => {
                changeFocus(carNumberForm.car2, "B");
            }}
            disabled={car2Disable}
        />
        <p>{getDriverName(carNumberForm.car2)}</p>
    </label>
    {#if mode == modeRacePhase}
        <AuditBlocks carNumberForm={carNumberForm} />
        <br />
    {/if}
    <SpinnerButton
        disabled={submitDisabled}
        on:click={handleSubmit}
        spinning={submitSpinning}
        focused={submitFocused}
    >
        {getRaceTypeEmoji(carNumberForm.promptPhaseType)}
        Add
        {getRaceTypeEmoji(carNumberForm.promptPhaseType)}
    </SpinnerButton>
</form>
