<script>
    import { raceConfig, statusMessage } from "./stores.js";
    import { store } from "./stores/auth.js";
    import { Auth } from "aws-amplify";
    import { push, pop, replace } from "svelte-spa-router";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import RawTimerLane from "./RawTimerLane.svelte";

    const EntityFactory = require("../backend/modules/lambdaDerby/src/shared/EntityFactory.js");
    const CalcFinish = require("./CalcFinish.js");

    import axios from "axios";
    export let params = {};
    const entityFactory = new EntityFactory({});
    var mounted = false;
    var timerHistoryList = [];
    var flatHistoryList = [];
    var winnerDeltas = [];
    var timerConfig;
    const hhmmss = "hhmmss";
    onMount(async () => {
        console.log("mounted focus: ", params);

        mounted = true;
        //refreshDataFromServer();
        testJson4Valid();
    });
    function testJson() {
        winnerDeltas = [{ "valid": false, "lanes": { "lane1": { "valid": false, "error": "lane flickered before finish" }, "lane2": { "valid": true, "noseMicros": 449682334089, "tailMicros": 449682399625, "carLenMicros": 65536, "carLenMS": 65.536 } }, "cBlock": [{ "pinState": 1, "pinType": "lane", "microPrev": 449678511130, "pubTime": 1594865928001, "microb": 449682334089, "pinNumber": "22", "pinName": "lane2", "micros": 449682334089, "seq": 224867 }, { "pinState": 0, "pinType": "lane", "microPrev": 449682328194, "pubTime": 1594865928031, "microb": 449682393474, "pinNumber": "17", "pinName": "lane1", "micros": 449682393474, "seq": 224868 }, { "pinState": 0, "pinType": "lane", "microPrev": 449682334089, "pubTime": 1594865928057, "microb": 449682399625, "pinNumber": "22", "pinName": "lane2", "micros": 449682399625, "seq": 224869 }] }, { "valid": true, "lanes": { "lane1": { "valid": true, "noseMicros": 449685955324, "tailMicros": 449686010349, "carLenMicros": 55025, "carLenMS": 55.025 }, "lane2": { "valid": true, "noseMicros": 449685949073, "tailMicros": 449686005129, "carLenMicros": 56056, "carLenMS": 56.056 } }, "cBlock": [{ "pinState": 1, "pinType": "lane", "microPrev": 449682399625, "pubTime": 1594865931569, "microb": 449685949073, "pinNumber": "22", "pinName": "lane2", "micros": 449685949073, "seq": 224872 }, { "pinState": 1, "pinType": "lane", "microPrev": 449682393474, "pubTime": 1594865931594, "microb": 449685955324, "pinNumber": "17", "pinName": "lane1", "micros": 449685955324, "seq": 224873 }, { "pinState": 0, "pinType": "lane", "microPrev": 449685949073, "pubTime": 1594865931624, "microb": 449686005129, "pinNumber": "22", "pinName": "lane2", "micros": 449686005129, "seq": 224874 }, { "pinState": 0, "pinType": "lane", "microPrev": 449685955324, "pubTime": 1594865931648, "microb": 449686010349, "pinNumber": "17", "pinName": "lane1", "micros": 449686010349, "seq": 224875 }] }, { "valid": false, "lanes": { "lane1": { "valid": false, "noseMicros": 449675667747, "tailMicros": 449678517925, "carLenMicros": 2850178, "carLenMS": 2850.178, "error": "CarLen [2850.178] greater than [1888]" }, "lane2": { "valid": false, "noseMicros": 449675672069, "tailMicros": 449678511130, "carLenMicros": 2839061, "carLenMS": 2839.061, "error": "CarLen [2839.061] greater than [1888]" } }, "cBlock": [{ "pinState": 1, "pinType": "lane", "microPrev": 448093160692, "pubTime": 1594865921287, "microb": 449675667747, "pinNumber": "17", "pinName": "lane1", "micros": 449675667747, "seq": 224855 }, { "pinState": 1, "pinType": "lane", "microPrev": 448093150427, "pubTime": 1594865921312, "microb": 449675672069, "pinNumber": "22", "pinName": "lane2", "micros": 449675672069, "seq": 224856 }, { "pinState": 0, "pinType": "lane", "microPrev": 449675667747, "pubTime": 1594865921340, "microb": 449675721972, "pinNumber": "17", "pinName": "lane1", "micros": 449675721972, "seq": 224857 }, { "pinState": 0, "pinType": "lane", "microPrev": 449675672069, "pubTime": 1594865921366, "microb": 449675727227, "pinNumber": "22", "pinName": "lane2", "micros": 449675727227, "seq": 224858 }, { "pinState": 1, "pinType": "lane", "microPrev": 449675727227, "pubTime": 1594865924076, "microb": 449678457199, "pinNumber": "22", "pinName": "lane2", "micros": 449678457199, "seq": 224860 }, { "pinState": 1, "pinType": "lane", "microPrev": 449675721972, "pubTime": 1594865924100, "microb": 449678461779, "pinNumber": "17", "pinName": "lane1", "micros": 449678461779, "seq": 224861 }, { "pinState": 0, "pinType": "lane", "microPrev": 449678457199, "pubTime": 1594865924130, "microb": 449678511130, "pinNumber": "22", "pinName": "lane2", "micros": 449678511130, "seq": 224862 }, { "pinState": 0, "pinType": "lane", "microPrev": 449678461779, "pubTime": 1594865924154, "microb": 449678517925, "pinNumber": "17", "pinName": "lane1", "micros": 449678517925, "seq": 224863 }] }, { "valid": false, "lanes": { "lane1": { "valid": false, "noseMicros": 449682328194, "tailMicros": 449682328194, "carLenMicros": 0, "carLenMS": 0, "error": "CarLen [0] less than [3]" }, "lane2": { "valid": false, "error": "No data for lane" } }, "cBlock": [{ "pinState": 1, "pinType": "lane", "microPrev": 449678517925, "pubTime": 1594865927946, "microb": 449682328194, "pinNumber": "17", "pinName": "lane1", "micros": 449682328194, "seq": 224866 }] }]
        console.log("test winnerDeltas:", winnerDeltas)
    }
    function testJson4Valid() {
        winnerDeltas = [{ "valid": true, "lanes": { "lane1": { "valid": true, "noseMicros": 538723484221, "tailMicros": 538723574481, "carLenMicros": 90260, "carLenMS": 90.26 }, "lane2": { "valid": true, "noseMicros": 538723491311, "tailMicros": 538723583596, "carLenMicros": 92285, "carLenMS": 92.285 } }, "cBlock": [{ "pinState": 1, "pinType": "lane", "microPrev": 449686010349, "pubTime": 1594954968763, "microb": 538723484221, "pinNumber": "17", "pinName": "lane1", "micros": 538723484221, "seq": 269395 }, { "pinState": 1, "pinType": "lane", "microPrev": 449686005129, "pubTime": 1594954968787, "microb": 538723491311, "pinNumber": "22", "pinName": "lane2", "micros": 538723491311, "seq": 269396 }, { "pinState": 0, "pinType": "lane", "microPrev": 538723484221, "pubTime": 1594954968853, "microb": 538723574481, "pinNumber": "17", "pinName": "lane1", "micros": 538723574481, "seq": 269397 }, { "pinState": 0, "pinType": "lane", "microPrev": 538723491311, "pubTime": 1594954968877, "microb": 538723583596, "pinNumber": "22", "pinName": "lane2", "micros": 538723583596, "seq": 269398 }] }, { "valid": true, "lanes": { "lane1": { "valid": true, "noseMicros": 538730548574, "tailMicros": 538730629224, "carLenMicros": 80650, "carLenMS": 80.65 }, "lane2": { "valid": true, "noseMicros": 538730539638, "tailMicros": 538730621789, "carLenMicros": 82151, "carLenMS": 82.151 } }, "cBlock": [{ "pinState": 1, "pinType": "lane", "microPrev": 538723583596, "pubTime": 1594954975818, "microb": 538730539638, "pinNumber": "22", "pinName": "lane2", "micros": 538730539638, "seq": 269402 }, { "pinState": 1, "pinType": "lane", "microPrev": 538723574481, "pubTime": 1594954975841, "microb": 538730548574, "pinNumber": "17", "pinName": "lane1", "micros": 538730548574, "seq": 269403 }, { "pinState": 0, "pinType": "lane", "microPrev": 538730539638, "pubTime": 1594954975900, "microb": 538730621789, "pinNumber": "22", "pinName": "lane2", "micros": 538730621789, "seq": 269404 }, { "pinState": 0, "pinType": "lane", "microPrev": 538730548574, "pubTime": 1594954975924, "microb": 538730629224, "pinNumber": "17", "pinName": "lane1", "micros": 538730629224, "seq": 269405 }] }, { "valid": true, "lanes": { "lane1": { "valid": true, "noseMicros": 538807365913, "tailMicros": 538807436153, "carLenMicros": 70240, "carLenMS": 70.24 }, "lane2": { "valid": true, "noseMicros": 538807371388, "tailMicros": 538807442673, "carLenMicros": 71285, "carLenMS": 71.285 } }, "cBlock": [{ "pinState": 1, "pinType": "lane", "microPrev": 538730629224, "pubTime": 1594955052644, "microb": 538807365913, "pinNumber": "17", "pinName": "lane1", "micros": 538807365913, "seq": 269445 }, { "pinState": 1, "pinType": "lane", "microPrev": 538730621789, "pubTime": 1594955052667, "microb": 538807371388, "pinNumber": "22", "pinName": "lane2", "micros": 538807371388, "seq": 269446 }, { "pinState": 0, "pinType": "lane", "microPrev": 538807365913, "pubTime": 1594955052714, "microb": 538807436153, "pinNumber": "17", "pinName": "lane1", "micros": 538807436153, "seq": 269447 }, { "pinState": 0, "pinType": "lane", "microPrev": 538807371388, "pubTime": 1594955052738, "microb": 538807442673, "pinNumber": "22", "pinName": "lane2", "micros": 538807442673, "seq": 269448 }] }, { "valid": true, "lanes": { "lane1": { "valid": true, "noseMicros": 538815647059, "tailMicros": 538815734839, "carLenMicros": 87780, "carLenMS": 87.78 }, "lane2": { "valid": true, "noseMicros": 538815638859, "tailMicros": 538815726084, "carLenMicros": 87225, "carLenMS": 87.225 } }, "cBlock": [{ "pinState": 1, "pinType": "lane", "microPrev": 538807442673, "pubTime": 1594955060917, "microb": 538815638859, "pinNumber": "22", "pinName": "lane2", "micros": 538815638859, "seq": 269453 }, { "pinState": 1, "pinType": "lane", "microPrev": 538807436153, "pubTime": 1594955060941, "microb": 538815647059, "pinNumber": "17", "pinName": "lane1", "micros": 538815647059, "seq": 269454 }, { "pinState": 0, "pinType": "lane", "microPrev": 538815638859, "pubTime": 1594955061004, "microb": 538815726084, "pinNumber": "22", "pinName": "lane2", "micros": 538815726084, "seq": 269455 }, { "pinState": 0, "pinType": "lane", "microPrev": 538815647059, "pubTime": 1594955061028, "microb": 538815734839, "pinNumber": "17", "pinName": "lane1", "micros": 538815734839, "seq": 269456 }] }, { "valid": false, "lanes": { "lane1": { "valid": false, "error": "No data for lane" }, "lane2": { "valid": true, "noseMicros": 539084890291, "tailMicros": 539085465557, "carLenMicros": 575266, "carLenMS": 575.266 } }, "cBlock": [{ "pinState": 1, "pinType": "lane", "microPrev": 538815726084, "pubTime": 1594955330167, "microb": 539084890291, "pinNumber": "22", "pinName": "lane2", "micros": 539084890291, "seq": 269591 }, { "pinState": 0, "pinType": "lane", "microPrev": 539084890291, "pubTime": 1594955330742, "microb": 539085465557, "pinNumber": "22", "pinName": "lane2", "micros": 539085465557, "seq": 269593 }] }]

        console.log("test winnerDeltas:", winnerDeltas)
    }
    async function refreshDataFromServer(trigger) {
        console.log("rawTimer: refreshDataFromDb data:", trigger);

        timerHistoryList = await getTimerHistory();
        console.log("rawTimer: refreshDataFromDb gave:", timerHistoryList);

        const flatHistory = flattenHistory(timerHistoryList);

        const calcFinish = new CalcFinish(timerConfig);
        winnerDeltas = calcFinish.calcFinishMain(flatHistory);

        console.log("winnerDeltas: ", JSON.stringify(winnerDeltas));
        updateBoundVars(timerHistoryList);
    }

    function flattenHistory(timerHistoryList) {
        flatHistoryList = [];
        timerHistoryList.forEach((record) => {
            if (record.dataList) {
                flatHistoryList.push(...record.dataList);
            }
            if (record.SK.startsWith("^")) {
                //timerConfig = entityFactory.build(record);
                timerConfig = record;
                console.log("timerConfig: ", timerConfig);
            }
        });
        flatHistoryList.sort((a, b) => {
            return a.microb - b.microb;
        })
        console.log("sorted flat:", flatHistoryList);

        return flatHistoryList;
    }

    const updateBoundVars = async (timerHistoryList) => {
        console.log("rawTimer: updateBoundVars gave:", timerHistoryList);
    };
    async function getTimerHistory() {
        console.log(`getTimerHistory: `);
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
        };

        console.log("token:" + bearer);

        axios.defaults.headers.common["Authorization"] = bearer;

        try {
            const response = await axios.get(
                $raceConfig.baseUrl + "/getTimerHistory",
                { params: req }
            );
            const data = response.data;
            $statusMessage = {
                text: `History loaded.`,
                type: "success",
            };
            return data;
        } catch (error) {
            console.log(error);
            $statusMessage = {
                text: "rawTimer failed: " + err,
                type: "error",
            };
        }
    }
    function getHHMMSS(winnerDelta) {
        console.log("pubtime: ", winnerDelta.cBlock[0].pubTime)
        const pubbed = new Date(winnerDelta.cBlock[0].pubTime).toLocaleTimeString();
        return pubbed;
    }
    function getBgColor(winnerDelta) {
        if (winnerDelta.valid) {
            return "green";
        }
        else {
            return "yellow";
        }
    }
    function getWinLane(winnerDelta) {
        const wt = getWinTime(winnerDelta);
        if (wt > 0) return "Lane1";
        if (wt < 0) return "Lane2";
        return "";
    }
    function getWinTime(winnerDelta) {
        if (winnerDelta.valid) {
            const wt = winnerDelta.lanes.lane2.noseMicros - winnerDelta.lanes.lane1.noseMicros;
            return wt;
        }
        return undefined;
    }
</script>
<style>
    .successMessage {
        background: rgb(218, 238, 218);
        color: black;
        padding: 1rem
    }
</style>
<div>
    <h4>Raw Timer List</h4>

    <p />

    {#each winnerDeltas.reverse() as winnerDelta}
    <div class="well well-sm " style="background: {getBgColor(winnerDelta)}">
        <div class="panel panel-info">
            <div class="panel-heading">
                <span class="spanRight">
                    {getHHMMSS(winnerDelta)}
                    </span>
        </div>
            {#if getWinTime(winnerDelta)}
            <p class="successMessage">
            Winner: {getWinLane(winnerDelta)} Time: {Math.abs(getWinTime(winnerDelta))}
            </p>
            {/if}
            <RawTimerLane lane="Lane1" laneJson={JSON.stringify(winnerDelta.lanes.lane1)}/>
            <RawTimerLane lane="Lane2" laneJson={JSON.stringify(winnerDelta.lanes.lane2)}/>
            <p/>
        </div>
        </div>
    {/each}
</div>
