<script>
    import { raceConfig, statusMessage } from "./stores.js";
    import { store } from "./stores/auth.js";
    import { Auth } from "aws-amplify";
    import { push, pop, replace } from "svelte-spa-router";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import { participantValid, participantFocusCompletion } from "./utils.js";
    import { faQuestionCircle } from "@fortawesome/free-solid-svg-icons/faQuestionCircle";
    import Icon from "fa-svelte";

    import axios from "axios";
    export let params = {};
    var showPhoeneticInfo = false;
    var mounted = false;
    var mode = "Add";
    var submitDisabled = true;
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
        const url = $raceConfig.baseUrl + "/addParticipant";
        try {
            const response = await axios.post(url, req);
            $statusMessage = {
                text: `Driver [${newPtcp}] Added.`,
                type: "success",
            };
            pop();
        } catch (error) {
            $statusMessage = {
                text: "driverAdd failed: " + error,
                type: "error",
            };
            //console.log("driverAdd failed: " + err)
        }
        driverForm.driverName = "";
        driverForm.carNumber = "";
    }

    const driverForm = {};

    const changeFocus = (carNumber, textboxIdentifier) => {
        if (textboxIdentifier == "A") {
            if (participantFocusCompletion(carNumber)) {
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
                participantValid(driverForm.carNumber) &&
                driverForm.driverName.toString() != ""
            ) {
                submitDisabled = false;
                console.log("sync add button SYNC");
            } else {
                submitDisabled = true;
                console.log("sync add button FAIL");
            }
        } else {
            submitDisabled = true;
            console.log("sync add button FAIL");
        }
    };
    async function requestSpeech() {
        var speakMe = `Driver name is ${driverForm.driverName}`;
        if (driverForm.sampa) {
            speakMe = `Driver name is <phoneme alphabet="x-sampa" ph="${driverForm.sampa}">${driverForm.driverName}</phoneme>`;
        }
        const ssml = `<speak>${speakMe}</speak>`;
        console.log("requesting speech");
        console.log(`handleSubmit: ${mode}` + JSON.stringify(driverForm));
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            ssml: ssml,
        };

        console.log("token:" + bearer);

        axios.defaults.headers.common["Authorization"] = bearer;

        const newPtcp = driverForm.carNumber;
        const url = $raceConfig.baseUrl + "/requestTts";
        try {
            const response = await axios.post(url, req);
            console.log("speech: ", response);
            $statusMessage = {
                text: `Speech Processed.`,
                type: "success",
            };
            new Audio(`/${response.data.speechMp3}`).play();
        } catch (error) {
            $statusMessage = {
                text: "speak failed: " + error,
                type: "error",
            };
            //console.log("driverAdd failed: " + err)
        }
    }
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
            placeholder="Phonetic name (X-SAMPA)" />
    </label>
    {#if showPhoeneticInfo}
        <p>
            The phoentic name field uses a plain-text version of the IPA
            (International Phoentic Alphabet) called X-SAMPA. For an english to
            X-SAMPA chart click
            <a target="_blank" href="https://en.wikipedia.org/wiki/X-SAMPA">
                here
            </a>
            .
        </p>
    {/if}
    <button type="submit" disabled={submitDisabled}>{mode}</button>
    <button type="button" on:click={requestSpeech}>Speak</button>
</form>
