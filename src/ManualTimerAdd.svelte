<script>
    import { raceConfig, statusMessage, driverMap } from "./stores.js";
    import { store } from "./stores/auth.js";
    import { Auth } from "aws-amplify";
    import { onMount } from "svelte";
    import { push, pop, replace } from "svelte-spa-router";

    import axios from "axios";
    export let params = {};

    let spinner = undefined; // empty to start.

    console.log("ManualTimeAdd", params);

    async function handleSubmit() {
        console.log("Manual Timer:" + JSON.stringify(resultForm));
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;

        if (resultForm.lane1 == "0") {
            resultForm.lane1 = 0;
        }
        if (resultForm.lane2 == "0") {
            resultForm.lane2 = 0;
        }

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,

            SK: params.rpKey,

            phr: [Number(resultForm.lane1), Number(resultForm.lane2)].reverse(),
        };

        axios.defaults.headers.common["Authorization"] = bearer;

        const endPoint = "/doApplyFinishTime";
        try {
            const response = await axios.post(
                $raceConfig.baseUrl + endPoint,
                req
            );
            if (response.data.error) {
                console.log("add failed", response);
                $statusMessage = {
                    text: response.data.error,
                    type: "error",
                };
            } else {
                console.log(endPoint + " axios success");
                pop();
            }
        } catch (err) {
            console.log(endPoint + " failed: " + err);
        }
        resultForm.lane1 = "0";
        resultForm.lane2 = "0";
    }
    const resultForm = {
        lane1: "0",
        lane2: "0",
    };

    const getUrlVars = () => {
        var vars = {};
        var parts = window.location.href.replace(
            /[?&]+([^=&]+)=([^&]*)/gi,
            function (m, key, value) {
                vars[key] = value;
            }
        );
        return vars;
    };

    var carNumber1 = getUrlVars()["carNumber1"];
    var carNumber2 = getUrlVars()["carNumber2"];

    const getDriverName = (number) => {
        console.log("gdn: " + number);
        if (number && $driverMap[number]) {
            return $driverMap[number].name;
        } else {
            return "Unknown Racer";
        }
    };
</script>

<style>
    .column {
        float: left;
        width: 50%;
        text-align: center;
    }

    /* Clear floats after the columns */
    .row:after {
        content: "";
        display: table;
        clear: both;
    }
</style>

<div style="width: 100%; text-align: center;">
    <h3>Manual Timing Results</h3>
</div>

<form on:submit|preventDefault={handleSubmit}>

    <div class="row">

        <div class="column">
            <h3>Lane 1</h3>
            <h4>Car Number: {carNumber1}</h4>
            <h5>Racer: {getDriverName(Number(carNumber1))}</h5>
            <label>
                Lane 1 Won by
                <input
                    type="number"
                    bind:value={resultForm.lane1}
                    placeholder="Lane1[{carNumber1}] MS" />
                MS
            </label>

        </div>

        <div class="column">
            <h3>Lane 2</h3>
            <h4>Car Number: {carNumber2}</h4>
            <h5>Racer: {getDriverName(Number(carNumber2))}</h5>
            <label>
                Lane 2 Won by
                <input
                    type="number"
                    bind:value={resultForm.lane2}
                    placeholder="Lane2[{carNumber2}] MS" />
                MS
            </label>

        </div>

    </div>
    <div style="width: 100%; text-align: center;">
        <button type="submit">Apply Time</button>
    </div>

</form>
