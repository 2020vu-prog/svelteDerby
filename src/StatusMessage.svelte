<script>
    import { statusMessage } from "./stores.js";
    var messages = [];
    const messageDuration = {
        error: 10000,
        success: 5000,
    };

    $: {
        console.log(`triggered by statusMessage change: ${statusMessage}`);
        if ($statusMessage && $statusMessage.text) {
            if (!$statusMessage.type) {
                $statusMessage.type = "error";
            }
            const newMsg = {
                text: $statusMessage.text,
                type: $statusMessage.type,
                TTL: getTtl($statusMessage),
                key: $statusMessage.key,
            };
            var prior;
            messages.forEach((msg, index) => {
                if (msg.key && msg.key === $statusMessage.key) {
                    prior = index;
                }
            });

            if (typeof prior !== "undefined") {
                messages[prior] = { ...newMsg }; // replace existing msg
            } else {
                messages.push(newMsg); // add new msg
            }
            messages = messages;
            clearLater(getDurationMs($statusMessage));
            $statusMessage = {};
        }
    }

    const clearNow = () => {
        const now = new Date().getTime();
        messages = messages.filter((msg) => {
            console.log("clearNow:", msg);
            return msg.TTL > now;
        });
    };
    const clearLater = (durationMs) => {
        if (messages.length > 0) {
            window.setTimeout(() => {
                clearNow();
            }, durationMs + 10); // add some fudge time to allow for potential of inaccurate/short wait
        }
    };
    const getDurationMs = (statusMessage) => {
        if (
            statusMessage &&
            statusMessage.type &&
            messageDuration[statusMessage.type]
        )
            return messageDuration[statusMessage.type];
        else return 60000;
    };
    const getTtl = (statusMessage) => {
        return new Date().getTime() + getDurationMs(statusMessage);
    };
</script>

<style>
    .errorMessage {
        background: papayawhip;
        color: red;
        padding: 1rem;
    }

    .successMessage {
        background: rgb(218, 238, 218);
        color: black;
        padding: 1rem;
    }

    .toasty {
        z-index: 50;
        overflow: hidden;
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100%;
    }
</style>

<div class="toasty">
    {#each messages as message}
        {#if message.type === 'error'}
            <p class="errorMessage">{message.text}</p>
        {/if}
        {#if message.type === 'success'}
            <p class="successMessage">{message.text}</p>
        {/if}
    {/each}
</div>
