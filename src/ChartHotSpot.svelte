<script>
        import { push, pop, replace } from 'svelte-spa-router'

    export let left;
    export let top;
    export let scale;
    export let pos;
    export let chartId;
    let scaledTop
    let scaledLeft
    let scaledWidth
    let scaledHeight
    $: {
        console.log("hotspot:", left, top, scale, pos)
        recalc();
    }
    const recalc=()=>{
        scaledTop = top * scale;
        scaledLeft = left * scale;
         scaledWidth= 175*scale;
     scaledHeight=30*scale;
    }
    const gotoChartPos=()=>{
        push(`/ChartPosition/${chartId}/${pos}`);

    }
</script>
<style>
    div.overlay {
        background: red;
    }
</style>
<div class="overlay" id="myDIV" on:click={()=>gotoChartPos()} 
    style="position: absolute;width: {scaledWidth}px;height: {scaledHeight}px;z-index: 2;left: {scaledLeft}px;top: {scaledTop}px;">{pos}
</div>