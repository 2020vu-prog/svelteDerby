<script>
    import { raceConfig, statusMessage, driverMap } from "./stores.js";
    import { store } from "./stores/auth.js";
    import { Auth } from "aws-amplify";
    import { onMount } from "svelte";
    import { push, pop, replace } from "svelte-spa-router";

    import axios from "axios";
    async function doAnnounce() {
        if (!announceText) {
            return;
        }

        console.log(`doAnnounce: ${announceText} `);
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            paMessage: `<speak>${announceText}</speak>`,
        };

        axios.defaults.headers.common["Authorization"] = bearer;

        const endpoint = "/initiateAnnouncement";

        try {
            const response = await axios.post(
                $raceConfig.baseUrl + endpoint,
                req
            );
            if (response.data.status === "error") {
                $statusMessage = {
                    text: response.data.error,
                    type: response.data.status,
                };
            } else {
                $statusMessage = {
                    text: `Announcement Requested.`,
                    type: "success",
                };
                announceText = "";
            }
        } catch (e) {
            $statusMessage = {
                text: e,
                type: "error",
            };
        }
    }

    async function doTestAnnouncement() {
        announceText = "Test Announcement";
        await doAnnounce();
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
        style="width: 100%;" />
    <br />
    <br />
    <input type="button" value="Announce" on:click={doAnnounce} />
</form>

<hr />

<h4>Test Announcement</h4>
<br />
<button on:click={doTestAnnouncement}>Test Announcement</button>
