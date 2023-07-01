<script>
    import log from "loglevel";

    import SpinnerButton from "./SpinnerButton.svelte";
    import { driverMap, axios, raceConfig, statusMessage } from "./stores.js";
    import { push, pop, replace } from "svelte-spa-router";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import { participantValid, participantFocusCompletion } from "./utils.js";
    import { isAllowedRoutePath } from "./utils.js";
    import { faQuestionCircle } from "@fortawesome/free-solid-svg-icons/faQuestionCircle";
    import Icon from "fa-svelte";
    const EntityFactory = require("../../backend/modules/lambdaDerby/src/shared/EntityFactory.js");

    export let params = {};
    var showPhoneticInfo = false;
    var mounted = false;
    var mode = "Add";
    var submitDisabled = true;
    var submitSpinning = false;
    var speakSpinning = false;
    var allowDriverJson = false;
    onMount(async () => {
        log.debug("mounted focus: ", params);

        mode = params.number ? "Update" : "Add";
        document.getElementById("carNumber").focus();
        mounted = true;
        $statusMessage = {
            text: `Ready to ${mode} Driver`,
            type: "success",
        };
        await refreshDataFromDb();
        syncAddButton();
        allowDriverJson = await isAllowedRoutePath(
            "/svelteDriverJson",
            $raceConfig.orgIz
        );
    });
    const onFileSelected = (e) => {
        //postDrivers(e.target.files[0])
        let jsonFile = e.target.files[0];
        let reader = new FileReader();
        reader.readAsBinaryString(jsonFile);
        reader.onload = (e) => {
            //avatar = e.target.result
            log.debug("OFS:", e.target.result);
            fmtAndPostDrivers(e.target.result);
        };
    };
    async function fmtAndPostDrivers(rawJson) {
        log.debug("OFS fmtAndPostDrivers:", rawJson);
        const bulkObject = JSON.parse(rawJson);
        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            bulk: Object.values(bulkObject),
        };

        postDrivers(req);
    }
    async function postDrivers(data) {
        log.debug("OFS postDrivers:", data);
        log.debug("addBulk begin: ", data);
        try {
            const response = await $axios.post(
                $raceConfig.baseUrl + "/addBulk",
                data,
                {
                    headers: {
                        // Overwrite Axios's automatically set Content-Type
                        "Content-Type": "application/json",
                    },
                }
            );
            $statusMessage = {
                text: `Driver json uploaded.`,
                type: "success",
            };
            pop();
        } catch (err) {
            log.debug("addBulk failed: " + err);
        }
    }
    function uploadDriverJson() {
        document.getElementById("driverJsonFileTag").click();
    }
    function downloadDriverJson(filename, text) {
        console.log("downloading:", $raceConfig);

        const eventName = $raceConfig.name;
        filename = `drivers-${eventName}.json`;
        text = JSON.stringify($driverMap);
        var element = document.createElement("a");
        element.setAttribute(
            "href",
            "data:text/plain;charset=utf-8," + encodeURIComponent(text)
        );
        element.setAttribute("download", filename);

        element.style.display = "none";
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    }
    async function refreshDataFromDb(trigger) {
        if (!params.number) return;

        log.debug("driverAdd: refreshDataFromDb data:", trigger);

        const ptcpFromDexie = await db.Participant.get(
            params.number.toString()
        );

        log.debug("driverAdd: refreshDataFromDb gave:", ptcpFromDexie);

        updateBoundVars(ptcpFromDexie);
    }
    const updateBoundVars = async (ptcpFromDexie) => {
        Object.assign(driverForm, ptcpFromDexie);
        log.debug("driverAdd: updateBoundVars gave:", driverForm);
        driverForm.carNumber = ptcpFromDexie.number;
        driverForm.driverName = ptcpFromDexie.name;
        driverForm.sampa = ptcpFromDexie.sampa;
    };
    async function handleSubmit() {
        log.debug(`handleSubmit: ${mode}` + JSON.stringify(driverForm));

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            number: Number(driverForm.carNumber),
            name: driverForm.driverName,
            pName: driverForm.pName,
            pType: driverForm.pType ? driverForm.pType : undefined,
        };

        const newPtcp = driverForm.carNumber;
        const url = $raceConfig.baseUrl + "/addParticipant";
        submitSpinning = true;
        try {
            const response = await $axios.post(url, req);
            $statusMessage = {
                text: `Driver [${newPtcp}] Added.`,
                type: "success",
            };
            pop();
        } catch (error) {
            submitSpinning = false;
            $statusMessage = {
                text: "driverAdd failed: " + error,
                type: "error",
            };
            //log.debug("driverAdd failed: " + err)
        }
    }

    const driverForm = { pType: undefined };

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
                log.debug("sync add button SYNC");
            } else {
                submitDisabled = true;
                log.debug("sync add button FAIL");
            }
        } else {
            submitDisabled = true;
            log.debug("sync add button FAIL");
        }
    };
    function getLocalSSML() {
        var mockUpDriverObject = {
            number: Number(driverForm.carNumber),
            name: driverForm.driverName,
            pName: driverForm.pName,
            pType: driverForm.pType,
            PK: ":PTCP",
        };
        const entityFactory = new EntityFactory({});
        var ptcpEntity = entityFactory.build(mockUpDriverObject);
        return ptcpEntity.ssmlName;
    }
    async function requestSpeech() {
        speakSpinning = true;

        const ssml = `<speak>Driver name is ${getLocalSSML()}</speak>`;
        log.debug("requesting speech");
        log.debug(`handleSubmit: ${mode}` + JSON.stringify(driverForm));

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            ssml: ssml,
        };

        const newPtcp = driverForm.carNumber;
        const url = $raceConfig.baseUrl + "/requestTts";
        try {
            const response = await $axios.post(url, req);
            log.debug("speech: ", response);
            $statusMessage = {
                text: `Speech Processed.`,
                type: "success",
            };
            const audio = new Audio(`/${response.data.speechMp3}`);
            audio.onended = function () {
                speakSpinning = false;
            };
            audio.play();
        } catch (error) {
            $statusMessage = {
                text: "speak failed: " + error,
                type: "error",
            };
            //log.debug("driverAdd failed: " + err)
        } finally {
        }
    }
</script>

<h3>{mode} Driver</h3>

<form>
    <label>
        Car Number:
        <input
            id="carNumber"
            type="number"
            bind:value={driverForm.carNumber}
            placeholder="Car Number"
            on:keyup={() => {
                changeFocus(driverForm.carNumber, "A");
            }}
        />
    </label>
    <label>
        Driver Name:
        <input
            id="driverName"
            type="text"
            bind:value={driverForm.driverName}
            placeholder="Driver Name"
            on:keyup={() => {
                changeFocus(null, "B");
            }}
        />
    </label>
    <label>
        Phonetic Name Type:
        <select bind:value={driverForm.pType}>
            <option value="">None</option>
            <option>X-SAMPA</option>
            <option>English</option>
        </select>
    </label>
    {#if driverForm.pType}
        <label>
            Phonetic Name
            <span on:click={() => (showPhoneticInfo = true)}>
                <Icon icon={faQuestionCircle} />
            </span>
            :
            <input
                type="text"
                bind:value={driverForm.pName}
                placeholder={`Phonetic name (${driverForm.pType})`}
            />
        </label>
    {/if}
    {#if showPhoneticInfo && driverForm.pType == "X-SAMPA"}
        <p>
            The phonetic name field uses a plain-text version of the IPA
            (International Phonetic Alphabet) called X-SAMPA. For an english to
            X-SAMPA chart click
            <a
                target="_blank"
                href="https://docs.aws.amazon.com/polly/latest/dg/ph-table-english-uk.html"
            >
                here
            </a>
            .
        </p>
    {/if}
    <SpinnerButton on:click={requestSpeech} spinning={speakSpinning}>
        Speak
    </SpinnerButton>
    <SpinnerButton
        disabled={submitDisabled}
        on:click={handleSubmit}
        spinning={submitSpinning}
    >
        {mode}
    </SpinnerButton>
    {#if allowDriverJson}
        <br />
        <br />
        <br />
        <br />
        <br />
        <h4>Driver json</h4>
        <SpinnerButton on:click={downloadDriverJson}>Download</SpinnerButton>
        <SpinnerButton on:click={uploadDriverJson}>Upload</SpinnerButton>

        <!-- this is unstyled file input tag, so hide it!-->
        <div style="height: 0px;width:0px; overflow:hidden;">
            <input
                id="driverJsonFileTag"
                name="driverJsonFileTag"
                accept="application/json"
                type="file"
                on:change={(e) => onFileSelected(e)}
            />
        </div>
    {/if}
</form>
