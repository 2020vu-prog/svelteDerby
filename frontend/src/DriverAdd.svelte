<script>
    import log from "loglevel";

    import { tick } from "svelte";

    import SpinnerButton from "./SpinnerButton.svelte";
    import { driverMap, axios, raceConfig, pushMessage } from "./stores.js";
    import { push, pop, replace } from "svelte-spa-router";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import { participantValid, participantFocusCompletion } from "./utils.js";
    import { downloadFile } from "./utils.js";
    import { createPermissionStore } from "./routes/permissionStore.js";
    import { faQuestionCircle } from "@fortawesome/free-solid-svg-icons/faQuestionCircle";
    import { stringify as csvStringify } from "csv-stringify/sync";
    import { parse as csvParse } from "csv-parse/sync";
    import SpotifyEmbedded from "./SpotifyEmbedded.svelte";
    const RoutePermission = require("../../backend/modules/lambdaDerby/src/shared/RoutePermission.js");

    import Icon from "fa-svelte";
    const EntityFactory = require("../../backend/modules/lambdaDerby/src/shared/EntityFactory.js");

    export let params = {};
    var showPhoneticInfo = false;
    var mounted = false;
    var mode = "Add";
    var submitDisabled = true;
    var submitSpinning = false;
    var speakSpinning = false;
    const canManageDriverJson = createPermissionStore(RoutePermission.POWER);
    let doPlay = false;

    onMount(async () => {
        log.debug("mounted focus: ", params);

        mode = params.number ? "Update" : "Add";
        document.getElementById("carNumber").focus();
        mounted = true;
        await refreshDataFromDb();
        syncAddButton();
    });
    const onFileSelected = (e) => {
        //postDrivers(e.target.files[0])
        let jsonFile = e.target.files[0];
        let reader = new FileReader();
        reader.readAsBinaryString(jsonFile);
        reader.onload = async (e) => {
            //avatar = e.target.result
            log.debug("OFS:", e.target.result);
            try {
                await fmtAndPostDrivers(e.target.result);
            } catch (err) {
                const importType =
                    InputFileContentType === "application/csv" ? "CSV" : "JSON";
                log.error(`Driver ${importType} upload failed:`, err);
                pushMessage({
                    text: `Driver ${importType} upload failed: ${err.message || err}`,
                    type: "error",
                });
            }
        };
    };
    async function fmtAndPostDrivers(rawData) {
        log.debug("OFS fmtAndPostDrivers:", rawData);
        if (InputFileContentType == "application/json") {
            await fmtAndPostJson(rawData);
        }
        if (InputFileContentType == "application/csv") {
            await fmtAndPostCsv(rawData);
        }
    }
    async function fmtAndPostCsv(rawData) {
        log.debug("fmtAndPostCsv:", rawData);
        const records = csvParse(rawData, {
            columns: true,
            skip_empty_lines: true,
        });
        const xmap = getCsvXrefAsMap();
        const jrecList = [];

        log.debug("fmtAndPostCsv p:", JSON.stringify(records));
        records.forEach((crec) => {
            const drvr = {
                // placeholders: backend will overwrite
                orgId: "Test.4b117",
                orgIz: "Test",
                PK: "Test.4b117:PTCP",
            };
            for (const [fldName, fldValue] of Object.entries(crec)) {
                drvr[xmap[fldName]] = fldValue;
            }
            if (drvr.name && drvr.number) {
                jrecList.push(drvr);
            }
        });
        log.debug("fmtAndPostCsv j:", JSON.stringify(jrecList));
        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            bulk: jrecList,
        };

        postDrivers(req);
    }
    async function fmtAndPostJson(rawData) {
        const bulkObject = JSON.parse(rawData);
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
            pushMessage({
                text: `Driver json uploaded.`,
                type: "success",
            });
            pop();
        } catch (err) {
            log.debug("addBulk failed: " + err);
        }
    }
    let InputFileContentType = "";
    async function uploadDriverJson() {
        InputFileContentType = "application/json";
        await tick();
        document.getElementById("driverJsonFileTag").click();
    }
    async function uploadDriverCsv() {
        InputFileContentType = "application/csv";
        await tick();
        document.getElementById("driverJsonFileTag").click();
    }
    const csvXref = [
        [
            "CarNumber",
            "ShortName",
            "Sponsor",
            "Notes",
            "PhoneticType",
            "PhoneticName",
            "WalkupLink",
        ],
        ["number", "name", "spon", "notes", "pType", "pName", "wLink"],
    ];
    function getCsvXrefAsMap() {
        const rc = {};
        csvXref[0].forEach((literal, idx) => {
            rc[literal] = csvXref[1][idx];
        });
        return rc;
    }
    function downloadDriverCsv() {
        console.log("downloading csv:`:", $raceConfig);
        console.log(
            "downloading csv xmap:`:",
            JSON.stringify(getCsvXrefAsMap())
        );

        const eventName = $raceConfig.name;
        const filename = `drivers-${eventName}.csv`;
        const rows = [csvXref[0]];
        let mapToArray = Array.from(Object.values($driverMap));
        mapToArray.forEach((drvr) => {
            console.log(JSON.stringify(drvr));
            const row = [];
            csvXref[1].forEach((fld) => row.push(drvr[fld]));

            //rows.push([drvr.number,drvr.name,drvr.spon,drvr.notes])
            rows.push(row);
        });
        const output = csvStringify(rows, {
            quoted: true,
        });
        const text = output; //generate($driverMap);
        downloadFile(filename, text);
    }
    function downloadDriverJson() {
        console.log("downloading json:", $raceConfig);

        const eventName = $raceConfig.name;
        const filename = `drivers-${eventName}.json`;
        const text = JSON.stringify($driverMap);
        downloadFile(filename, text);
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
        driverForm.carSponsor = ptcpFromDexie.spon;
        driverForm.carNotes = ptcpFromDexie.notes;
        driverForm.sampa = ptcpFromDexie.sampa;
        driverForm.walkupLink = ptcpFromDexie.wLink;
    };
    async function handleSubmit() {
        log.debug(`handleSubmit: ${mode}` + JSON.stringify(driverForm));

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            number: driverForm.carNumber,
            name: driverForm.driverName,
            spon: driverForm.carSponsor,
            notes: driverForm.carNotes,
            pName: driverForm.pName,
            pType: driverForm.pType ? driverForm.pType : undefined,
            wLink: driverForm.walkupLink,
        };

        const newPtcp = driverForm.carNumber;
        const url = $raceConfig.baseUrl + "/addParticipant";
        submitSpinning = true;
        try {
            const response = await $axios.post(url, req);
            pushMessage({
                text: `Driver [${newPtcp}] Added.`,
                type: "success",
            });
            pop();
        } catch (error) {
            submitSpinning = false;
            pushMessage({
                text: "driverAdd failed: " + error,
                type: "error",
            });
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
            pushMessage({
                text: `Speech Processed.`,
                type: "success",
            });
            const audio = new Audio(`/${response.data.speechMp3}`);
            audio.onended = function () {
                speakSpinning = false;
            };
            audio.play();
        } catch (error) {
            pushMessage({
                text: "speak failed: " + error,
                type: "error",
            });
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
            type="text"
            pattern="\d*"
            inputmode="numeric"
            bind:value={driverForm.carNumber}
            placeholder="Car Number"
            disabled={mode === "Update"}
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
        Car Sponsor:
        <input
            id="carSponsor"
            type="text"
            bind:value={driverForm.carSponsor}
            placeholder="Car Sponsor"
        />
    </label>
    <label>
        Notes:
        <textarea
            id="carNotes"
            bind:value={driverForm.carNotes}
            placeholder="Driver Notes"
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
    <label>
        <a target="_blank" href="https://open.spotify.com/">
            Walk up Spotify link
        </a>

        <input
            id="walkUp"
            type="text"
            bind:value={driverForm.walkupLink}
            placeholder="Walkup Link"
        />
    </label>
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
    {#if driverForm.walkupLink}
        <SpinnerButton on:click={() => (doPlay = true)}>Play</SpinnerButton>
    {/if}
    {#if doPlay && driverForm.walkupLink}
        {#key driverForm.walkupLink}
            <SpotifyEmbedded autoPlay="false" href={driverForm.walkupLink} />
        {/key}
    {/if}
    {#if $canManageDriverJson}
        <br />
        <br />
        <br />
        <br />
        <h4>Driver CSV</h4>
        <SpinnerButton on:click={downloadDriverCsv}>Download</SpinnerButton>
        <SpinnerButton on:click={uploadDriverCsv}>Upload</SpinnerButton>
        <br />
        <h4>Driver json</h4>
        <SpinnerButton on:click={downloadDriverJson}>Download</SpinnerButton>
        <SpinnerButton on:click={uploadDriverJson}>Upload</SpinnerButton>
        <br />

        <!-- this is unstyled file input tag, so hide it!-->
        <div style="height: 0px;width:0px; overflow:hidden;">
            <input
                id="driverJsonFileTag"
                name="driverJsonFileTag"
                accept={InputFileContentType}
                type="file"
                on:change={(e) => onFileSelected(e)}
            />
        </div>
    {/if}
</form>
