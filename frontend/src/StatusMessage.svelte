<script>
    import log from "loglevel";

    import {
        pushMessage,
        statusMessageList,
        raceConfig,
        clearOldStatusMessages,
    } from "./stores.js";
    import { onMount } from "svelte";

    let messages = [];
    const messageDuration = {
        error: 10000,
        success: 5000,
        archiveWarning: 3600000,
    };

    $: if ($clearOldStatusMessages) {
        clearAllMessages($raceConfig);
    }

    //Get rid of archive warning (and other messages) when the user picks a new race.
    function clearAllMessages() {
        log.debug("StatusMessage RC cam: ", $raceConfig);
        $clearOldStatusMessages = false;
        messages = [];
        //This message is used to coerce the empty list to repaint.
        pushMessage({
            text: `New race selected.`,
            type: "success",
        });
    }

    onMount(async () => {
        log.debug("StatusMessage.svelte mounting");
        log.debug("StatusMessage RC: ", $raceConfig);
    });
    $: {
        $statusMessageList.forEach((msg, index) => {
            loadNewMsg(msg);
        });
        //$statusMessageList.length=0;  // truncate array to empty
        if ($statusMessageList.length > 0) {
            $statusMessageList = []; // expect to recurse back to self as empty
        }
    }
    function loadNewMsg(msg) {
        log.debug(`loadNewMsg triggered by statusMessage change: `, msg);
        if (msg && msg.text) {
            if (!msg.type) {
                msg.type = "error";
            }
            const newMsg = {
                text: msg.text,
                type: msg.type,
                TTL: getTtl(msg),
                key: msg.key,
                orgId: $raceConfig.orgId,
            };
            let prior;
            messages.forEach((imsg, index) => {
                if (imsg.key && imsg.key === newMsg.key) {
                    prior = index;
                }
            });

            if (typeof prior !== "undefined") {
                messages[prior] = { ...newMsg }; // replace existing msg
            } else {
                messages.push(newMsg); // add new msg
            }
            messages = messages;
            clearNow(); //in case anything deleted by short TTL
            clearLater(getDurationMs(msg));
        }
    }

    const clearNow = () => {
        const now = new Date().getTime();
        messages = messages.filter((msg) => {
            log.debug("clearNow:", msg);
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
        log.debug(`getTTL ${statusMessage.text}`);
        if (statusMessage.TTL) {
            log.debug(`HAS A TTL ${statusMessage.TTL}`);
            return statusMessage.TTL;
        } else {
            return new Date().getTime() + getDurationMs(statusMessage);
        }
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

    .archiveWarningMessage {
        background: rgb(245, 227, 66);
        color: red;
        padding: 1rem;
    }

    .toasty {
        z-index: 50;
    }
</style>

<div class="toasty">
    {#each messages as message}
        {#if message.type === "error"}
            <p class="errorMessage">{message.text}</p>
        {/if}
        {#if message.type === "success"}
            <p class="successMessage">{message.text}</p>
        {/if}
        {#if message.type === "archiveWarning"}
            <p class="archiveWarningMessage">{message.text}</p>
        {/if}
    {/each}
</div>
