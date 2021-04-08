<script>
    import log from "loglevel";

    import { driverMap } from "./stores.js";
    import { onMount } from "svelte";

    export let number;
    let name = "";
    export let at;
    onMount(async () => {
        log.debug(`CarAndDriver onMount: ${number} `);
        name = getDriverName(number, at);
    });
    $: {
        log.debug("lookup modified DN:", number);
        name = getDriverName(number, at);
    }

    const getDriverName = (number) => {
        //log.debug("gdn: "+carNumber)
        if (number && $driverMap[number]) {
            return $driverMap[number].name;
        } else {
            return " ";
        }
    };
</script>

<div style="text-align: center !important; display: inline">
    <b style="font-size: 31px">{number}</b>
    <br />
    {name}
</div>
