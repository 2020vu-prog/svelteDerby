<script>
    import { statusMessage } from './stores.js';
    var messages = [];
    const messageDuration = 5000;
    $: {
        console.log(`triggered by statusMessage change: ${statusMessage}`);
        if ($statusMessage && $statusMessage.text) {
            if (!$statusMessage.type) {
                $statusMessage.type = "error";
            }
            messages.push({ text: $statusMessage.text, type: $statusMessage.type, TTL: getTtl() });
            messages = messages;
            $statusMessage = {};
            clearLater();
        }
    }

    const clearNow = () => {
        const now = new Date().getTime();
        messages = messages.filter(msg => {
            console.log("clearNow:", msg)
            return (msg.TTL > now)
        });
    }
    const clearLater = () => {
        if (messages.length > 0) {
            window.setTimeout(() => {
                clearNow();
            }, messageDuration);
        }
    }
    const getTtl = () => {
        return new Date().getTime() + messageDuration;
    }
</script>
<style>
    .errorMessage {
        background: papayawhip;
        color: red;
        padding: 1rem;
    }

    .successMessage {
        background: lightgreen;
        color: green;
        padding: 1rem;
    }
</style>
{#each messages as message}
{#if message.type==="error"}
<p class="errorMessage">{message.text}</p>
{/if}
{#if message.type==="success"}
<p class="successMessage">{message.text}</p>
{/if}
{/each}