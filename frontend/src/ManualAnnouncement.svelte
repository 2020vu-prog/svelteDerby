<script>
    import log from "loglevel";

    import Walkup from "./Walkup.svelte";
    import { raceConfig, pushMessage, driverMap, axios } from "./stores.js";
    import { onMount } from "svelte";
    import { push, pop, replace } from "svelte-spa-router";
    async function doAnnounce() {
        if (!announceText) {
            return;
        }

        log.debug(`doAnnounce: ${announceText} `);

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            paMessage: `<speak>${announceText}</speak>`,
        };

        const endpoint = "/initiateAnnouncement";

        try {
            const response = await $axios.post(
                $raceConfig.baseUrl + endpoint,
                req
            );
            pushMessage( {
                text: `Announcement Requested.`,
                type: "success",
            });
            announceText = "";
        } catch (e) {
            //interceptor handles messaging
            log.debug("axios err:", e);
        }
    }

    async function doTestAnnouncement() {
        announceText = `Test Announcement at ${nowHHMMMS()}`;
        await doAnnounce();
    }
    async function doResetPolly() {
        announceText = "ResetPollyAA466430-D313-488D-A485-22CC00FE84B0";
        await doAnnounce();
    }
    function checkTime(i) {
        return i < 10 ? "0" + i : i;
    }

    function nowHHMMMS() {
        var today = new Date(),
            h = checkTime(today.getHours()),
            m = checkTime(today.getMinutes()),
            s = checkTime(today.getSeconds());
        return h + ":" + m + ":" + s;
    }

    var announceText = "";
</script>

<div style="width: 100%; text-align: center;">
    <h3>Manual Announcement</h3>
</div>
<h4>Plain Text Announcement</h4>
<form>
    <label for="announcement">Announcement:</label>
    <textarea
        rows="5"
        type="text"
        id="announcement"
        name="announcement"
        bind:value={announceText}
        style="width: 100%;"
    />
    <br />
    <br />
    <input type="button" value="Announce" on:click={doAnnounce} />
</form>

<hr />

<h4>Test Announcement</h4>
<br />
<button on:click={doTestAnnouncement}>Test Announcement</button>
<button on:click={doResetPolly}>Reset Polly Bot</button>

<Walkup/>
