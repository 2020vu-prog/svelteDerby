<script>
    import log from "loglevel";
    export let msgs=[];
    const showDebug=false

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
                return "🟡";
            case log.levels.INFO:
                //return "ℹ️";
                return "️✅";
        }
                return "❌";

    }
</script>
{#each msgs as msg (msg.msg)}
    {#if showDebug || msg.level > log.levels.DEBUG}
        {getMsgEmoji(msg)} {msg.msg}
        <br/>
    {/if}
{/each}
