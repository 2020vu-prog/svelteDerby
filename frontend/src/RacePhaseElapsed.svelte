<script>
    import log from "loglevel";
    import {
        Card,
        CardBody,
        CardHeader,
        CardTitle,
        CardFooter,
        Badge,
        Table,
    } from "sveltestrap";
    import { onMount } from "svelte";
    export let params = {};
    onMount(async () => {
        log.debug("RacePhaseElapsed:", params);
    });
    const laneData = [
        {
            timer: "Ramps",
            l1: 123,
            l2: 123,
        },
        {
            timer: "Hill ",
            l1: 456.77,
            l2: 456.78,
        },
        {
            timer: "Finish",
            l1: 887.655,
            l2: 887.657,
        },
    ];
</script>

<Table striped>
    <thead>
        <tr>
            <th>Timer</th>
            <th>Lane1</th>
            <th>Lane2</th>
        </tr>
    </thead>
    <tbody>
        {#each laneData as row (row.timer)}
            <tr>
                <th scope="row">{row.timer}</th>
                <td>{row.l1}</td>
                <td>{row.l2}</td>
            </tr>
        {/each}
    </tbody>
</Table>
