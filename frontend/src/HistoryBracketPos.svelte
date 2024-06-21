<script>
import log from "loglevel";
import { onMount } from "svelte";
import         {hhmmssFmt,} from './utils.js'
export let bp;
onMount(async () => {
        log.debug("history bp");
        log.debug(JSON.stringify(bp));
})
function getHeat(){
    return(bp.SK.replace(/.*:/,''))
}
function xlateStatus(status){
    if(status==='ptcp'){
        return 'Racer'
    }
    return status

}
</script>
<p/>
<h6>

--------- Heat: {getHeat()}
</h6>
{hhmmssFmt(bp.at)}
        <br/>
By: {bp.by}
        <br/>
        <ul>

{#each Object.keys(bp.pos) as pos }

<li>
    
        {pos}:
        {xlateStatus(bp.pos[pos].status)}:
        {bp.pos[pos].ptcp}
        <br/>
</li>
{/each}
        
        </ul>
