<script>
    import log from "loglevel";
    import WarningSvg from "./svg/warningSvg.svelte";
    export let msgs=[];
    let showDebug=false

    function getMsgEmoji(msg){
        let lvl=msg.level
        if(!lvl){
            lvl=log.levels.DEBUG
        }
        
        switch(lvl){
            case log.levels.DEBUG:
                return "️️🐞";
                return "️ℹ️";
            case log.levels.ERROR:
                return "❌";
            case log.levels.WARN:
                return "⚠️";
            case log.levels.INFO:
                //return "ℹ️";
                return "️✅";
        }
                return "❌";

    }
</script>
<span 
    on:click={() => showDebug=!showDebug}
>
{#each msgs as msg (msg.msg)}
    {#if showDebug || msg.level > log.levels.DEBUG}
        {#if msg.level == log.levels.WARN }
            <WarningSvg/>
        {:else}
            {getMsgEmoji(msg)} 
        {/if}
        {msg.msg}
        <br/>
    {/if}
{/each}
</span>
