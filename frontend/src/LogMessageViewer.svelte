<script>
    import log from "loglevel";
    import { onMount } from "svelte";
    import { Button } from "sveltestrap";
    import ByLine from "./ByLine.svelte";
    import { db } from "./eventDb.js";

    let logMessages = [];
    let loading = true;
    let errorMessage = "";
    let expandedMessageKey = "";

    onMount(async () => {
        await refreshLogMessages();
    });

    async function refreshLogMessages() {
        loading = true;
        errorMessage = "";
        try {
            logMessages = await db.LogMessage.orderBy("SK").reverse().toArray();
        } catch (err) {
            log.error("LogMessageViewer refresh error:", err);
            errorMessage = String(err);
            logMessages = [];
        } finally {
            loading = false;
        }
    }

    function formatTime(logMessage) {
        const date = new Date(logMessage.SK || logMessage.at);
        if (Number.isNaN(date.getTime())) {
            return logMessage.SK || "";
        }
        return date.toLocaleString();
    }

    function formatDetail(detail) {
        if (!detail) {
            return "";
        }
        if (typeof detail === "string") {
            return detail;
        }
        return JSON.stringify(detail, null, 2);
    }

    function getLevelEmoji(level) {
        const normalizedLevel = String(level || "debug").toLowerCase();
        if (normalizedLevel === "0" || normalizedLevel === "trace") return "🔎";
        if (normalizedLevel === "1" || normalizedLevel === "debug") return "🐞";
        if (normalizedLevel === "2" || normalizedLevel === "info") return "ℹ️";
        if (normalizedLevel === "3" || normalizedLevel === "warn") return "⚠️";
        if (normalizedLevel === "4" || normalizedLevel === "error") return "❌";
        return "📝";
    }

    function toggleDetail(logMessage) {
        const messageKey = logMessage.SK;
        expandedMessageKey =
            expandedMessageKey === messageKey ? "" : messageKey;
    }
</script>

<style>
    .toolbar {
        align-items: center;
        display: flex;
        gap: 0.75rem;
        justify-content: space-between;
        margin: 0.75rem 0;
    }

    .log-message {
        border-bottom: 1px solid #ddd;
        cursor: pointer;
        padding: 0.75rem 0;
    }

    .log-message-header {
        color: #444;
        font-size: 0.9rem;
        margin-bottom: 0.25rem;
    }

    .message {
        font-size: 1rem;
        margin-bottom: 0.25rem;
    }

    pre {
        background-color: #f5f5f5;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 0.85rem;
        margin: 0.5rem 0 0;
        overflow-x: auto;
        padding: 0.5rem;
        white-space: pre-wrap;
    }
</style>

<div class="toolbar">
    <h4>Log Messages</h4>
    <Button
        color="primary"
        size="sm"
        on:click={refreshLogMessages}
        disabled={loading}
    >
        Refresh
    </Button>
</div>

{#if loading}
    <p>Loading log messages...</p>
{:else if errorMessage}
    <p class="text-danger">Unable to load log messages: {errorMessage}</p>
{:else if logMessages.length === 0}
    <p>No log messages found.</p>
{:else}
    {#each logMessages as logMessage (logMessage.SK)}
        <section class="log-message" on:click={() => toggleDetail(logMessage)}>
            <div class="log-message-header">
                {formatTime(logMessage)}
                | {getLevelEmoji(logMessage.level)}
                {logMessage.level || "debug"}
                {#if expandedMessageKey === logMessage.SK && logMessage.source}
                    | {logMessage.source}
                {/if}
            </div>
            <div class="message">{logMessage.message}</div>
            {#if expandedMessageKey === logMessage.SK}
                <ByLine entity={logMessage} />
                {#if formatDetail(logMessage.detail)}
                    <pre>{formatDetail(logMessage.detail)}</pre>
                {/if}
            {/if}
        </section>
    {/each}
{/if}
