<script>
import { spinnerPanelBusy } from "./stores.js";
import CirclesSvg from './CirclesSvg.svelte'
const screenW=window.screen.width
const screenH=window.screen.height
const spinXY=Math.min(screenH,screenW)
</script>
<style>
    div{
        position:absolute;
        background: black;
        color: whitesmoke;
        z-index: 289;
    }
</style>
{#if $spinnerPanelBusy}
<!--

<div style="z-index: 289;">
-->
<div>
<h4>Working...</h4>
<CirclesSvg 
    width={spinXY}
    height={spinXY}/>
</div>
{/if}
