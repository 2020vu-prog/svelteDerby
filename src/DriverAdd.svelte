<script>
    import { raceConfig, statusMessage } from "./stores.js";
    import { store } from "./stores/auth.js";
    import { Auth } from "aws-amplify";
    import { push, pop, replace } from "svelte-spa-router";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";

    import { faQuestionCircle } from "@fortawesome/free-solid-svg-icons/faQuestionCircle";
    import Icon from "fa-svelte";

    import axios from "axios";
    export let params = {};
    var showPhoeneticInfo = false;
    var mounted = false;
    var mode = "Add";
    onMount(async () => {
        console.log("mounted focus: ", params);

        mode = params.number ? "Update" : "Add";
        document.getElementById("carNumber").focus();
        mounted = true;
        $statusMessage = {
            text: `Ready to ${mode} Driver`,
            type: "success",
        };
        refreshDataFromDb();
    });
    async function refreshDataFromDb(trigger) {
        if (!params.number) return;

        console.log("driverAdd: refreshDataFromDb data:", trigger);

        const ptcpFromDexie = await db.Participant.get(
            params.number.toString()
        );

        console.log("driverAdd: refreshDataFromDb gave:", ptcpFromDexie);

        updateBoundVars(ptcpFromDexie);
    }
    const updateBoundVars = async (ptcpFromDexie) => {
        Object.assign(driverForm, ptcpFromDexie);
        console.log("driverAdd: updateBoundVars gave:", driverForm);
        driverForm.carNumber = ptcpFromDexie.number;
        driverForm.driverName = ptcpFromDexie.name;
        driverForm.sampa = ptcpFromDexie.sampa;
    };
    async function handleSubmit() {
        console.log(`handleSubmit: ${mode}` + JSON.stringify(driverForm));
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            number: Number(driverForm.carNumber),
            name: driverForm.driverName,
            sampa: driverForm.sampa,
        };

        console.log("token:" + bearer);

        axios.defaults.headers.common["Authorization"] = bearer;

        const newPtcp = driverForm.carNumber;
        axios
            .post($raceConfig.baseUrl + "/addParticipant", req)
            .then((response) => {
                $statusMessage = {
                    text: `Driver [${newPtcp}] Added.`,
                    type: "success",
                };
                //console.log("driverAdd axios success")
                pop();
            })
            .catch((err) => {
                $statusMessage = {
                    text: "driverAdd failed: " + err,
                    type: "error",
                };
                //console.log("driverAdd failed: " + err)
            });
        driverForm.driverName = "";
        driverForm.carNumber = "";
    }

    const driverForm = {};

    const changeFocus = (carNumber, textboxIdentifier) => {
        if (textboxIdentifier == "A") {
            if (carNumber.toString().length == 3) {
                document.getElementById("driverName").focus();
            }
        }
        syncAddButton();
    };

    const syncAddButton = () => {
        if (!mounted) {
            return;
        }
        if (driverForm.carNumber && driverForm.driverName) {
            if (
                String(driverForm.carNumber).length >= 3 &&
                driverForm.driverName.toString() != ""
            ) {
                document.getElementById("formSubmitButton").disabled = false;
                console.log("sync add button SYNC");
            } else {
                document.getElementById("formSubmitButton").disabled = true;
                console.log("sync add button FAIL");
            }
        } else {
            document.getElementById("formSubmitButton").disabled = true;
            console.log("sync add button FAIL");
        }
    };
</script>

<h3>{mode} Driver</h3>

<form on:submit|preventDefault={handleSubmit}>

    <label>
        Car Number:
        <input
            id="carNumber"
            type="number"
            bind:value={driverForm.carNumber}
            placeholder="Car Number"
            on:keyup={() => {
                changeFocus(driverForm.carNumber, 'A');
            }} />
    </label>
    <label>
        Driver Name:
        <input
            id="driverName"
            type="text"
            bind:value={driverForm.driverName}
            placeholder="Driver Name"
            on:keyup={() => {
                changeFocus(null, 'B');
            }} />
    </label>
    <label>
        Phonetic Name (optional)
        <span on:click={() => (showPhoeneticInfo = true)}>
            <Icon icon={faQuestionCircle} />
        </span>
        :
        <input
            id="sampa"
            type="text"
            bind:value={driverForm.sampa}
            placeholder="Phonetic name (SAMPA)" />
    </label>
    {#if showPhoeneticInfo}
        <p>
            The phoentic name field uses a plain-text version of the IPA
            (International Phoentic Alphabet) called SAMPA. For an english to
            SAMPA chart click
            <a
                target="_blank"
                href="https://en.wikipedia.org/wiki/SAMPA_chart_for_English">
                here
            </a>
            .
        </p>
    {/if}
    <button id="formSubmitButton" type="submit" disabled>{mode}</button>
</form>
