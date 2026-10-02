<script>
    // Stands in for ChartHotSpot in tests and shows the props it was given.
    export let pos = "";
    export let left = undefined;
    export let top = undefined;
</script>

<div data-testid="hotspot" data-pos={pos} data-left={left} data-top={top} />
