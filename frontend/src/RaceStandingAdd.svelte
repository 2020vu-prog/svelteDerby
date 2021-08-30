<script>
    import log from "loglevel";

    import SpinnerButton from "./SpinnerButton.svelte";
    import {
        raceConfig,
        driverMap,
        statusMessage,
        nextOnBlockKey,
        axios,
    } from "./stores.js";
    import { onMount } from "svelte";
    import { push, pop, replace } from "svelte-spa-router";
    import { participantValid, participantFocusCompletion } from "./utils.js";

    export let params = {};
    log.debug("RaceStandingAdd", params);
    var mounted = false;
    var submitFocused = false;
    var submitDisabled = true;
    var submitSpinning = false;
    const typeVars = {
        RaceStanding: {
            title: "Add Pending Race",
            endPoint: "/addPending",
        },
        RacePhase: {
            title: "Add Blocks",
            endPoint: "/addBlocks",
        },
    };
    var title = "abc";
    const unMapType = (feature) => {
        if (typeVars[params.type] && typeVars[params.type][feature]) {
            return typeVars[params.type][feature];
        }
        log.debug("unMapType:missing map for ", params.type, feature);
        return "unknown";
    };
    onMount(async () => {
        log.debug("mounted type:", params.type);
        title = unMapType("title");
        document.getElementById("cn1").focus();
        mounted = true;
    });
    function changeFocus(carNumber, seedIdentifier) {
        //log.debug("changeFocus ", seedIdentifier, " ", carNumber);
        if (participantFocusCompletion(carNumber)) {
            if (seedIdentifier == "A") {
                document.getElementById("cn2").focus();
                syncAddButton(false);
            } else if (seedIdentifier == "B") {
                syncAddButton(true);
            }
        } else {
            syncAddButton(false);
        }
    }

    async function handleSubmit() {
        const endPoint = unMapType("endPoint");

        if (endPoint == "/addBlocks" && $nextOnBlockKey.length > 0) {
            $statusMessage = {
                text:
                    "You cannot add a race to the blocks when the blocks are already occupied.",
                type: "error",
            };
            return;
        }

        log.debug("Adding:" + JSON.stringify(carNumberForm));

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            cn: [
                String(carNumberForm.car1) + "",
                String(carNumberForm.car2) + "",
            ],
        };

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

            if (response.data.error) {
                log.debug("add failed", response);
                $statusMessage = {
                    text: response.data.error,
                    type: "error",
                };
            } else {
                await sleep(1000); // verify spinner
                pop();
            }
        } catch (err) {
            $statusMessage = {
                text: err,
                type: "error",
            };
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
    const carNumberForm = {};
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
            submitDisabled = true;
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
</script>

<h3>{title}</h3>

<form>
    <label>
        <input
            type="number"
            bind:value={carNumberForm.car1}
            placeholder="Car 1"
            id="cn1"
            on:keyup={() => {
                changeFocus(carNumberForm.car1, 'A');
            }} />
        <p>{getDriverName(carNumberForm.car1)}</p>
    </label>

    <label>
        <input
            type="number"
            bind:value={carNumberForm.car2}
            placeholder="Car 2"
            id="cn2"
            on:keyup={() => {
                changeFocus(carNumberForm.car2, 'B');
            }} />
        <p>{getDriverName(carNumberForm.car2)}</p>
    </label>
    <SpinnerButton
        disabled={submitDisabled}
        on:click={handleSubmit}
        spinning={submitSpinning}
        focused={submitFocused}>
        Add
    </SpinnerButton>
</form>
