<script>
    import { push, pop, replace } from "svelte-spa-router";
    import { Form, FormGroup, FormText, Input, Label } from "sveltestrap";
    import SpinnerButton from "./SpinnerButton.svelte";

    import { axios, raceConfig, pushMessage, userEmail } from "./stores.js";
    import { onMount } from "svelte";
    import QRCode from "qrcode";

    const configLink = "http://10.42.0.1:5000/index.html";
    let qrsvg = "";
    onMount(async () => {
        getQrSvg();
    });
    async function getQrSvg() {
        try {
            qrsvg = await QRCode.toString(configLink, { type: "svg" });
            return qrsvg;
        } catch (err) {
            console.error(err);
        }
        return "";
    }
</script>
<h4>Setup Timer WiFi</h4>
<ul>
    <li>Power on timer and wait 3 minutes</li>
    <li>Connect phone wifi to timer.</li>
    <li>
        SSID is <strong> RR1T-[TimerName] </strong>
        Password is <strong> setup999 </strong>
    </li>
    <li>
        it won't have internet access, and you may have to re-assure your phone
        you want to <strong>CONNECT ANYWAY</strong>
    </li>
    <li>
        Browse to <a href={configLink}>{configLink}</a> link. (you may have turn off
        your main internet to get the page to load)
    </li>
    <li>
        configure desired / hotspot network info and hit <strong>Apply</strong>
    </li>
    <li>Wait one minute</li>
    <li>
        Return to the <a href="/#/timerConfigList">Elapsed Timer Config</a>
        Press the <strong>+</strong> icon and add your timer!
    </li>
</ul>

{@html qrsvg}
