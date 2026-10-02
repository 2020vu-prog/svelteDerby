<script>
    import { createEventDispatcher } from "svelte";
    import { containsChart } from "#src/chartTree.js";

    // Nodes from buildChartTree. Folders are native <details> elements and
    // charts are radio buttons sharing one group name, so expanding, keyboard
    // use, and single selection need no scripting.
    export let nodes = [];
    export let selected = "";
    export let name = "chartTree";

    const dispatch = createEventDispatcher();

    // Which folders are open, by id. Choosing a chart opens the folders that
    // hold it; folders the user opened or closed themselves are left alone.
    let opened = {};
    $: for (const node of nodes) {
        if (containsChart(node, selected)) opened[node.id] = true;
    }
</script>

<ul class="chart-tree">
    {#each nodes as node (node.id)}
        <li>
            {#if node.children}
                <details bind:open={opened[node.id]}>
                    <summary>{node.name}</summary>
                    <svelte:self
                        nodes={node.children}
                        selected={selected}
                        name={name}
                        on:select
                    />
                </details>
            {:else}
                <label class:selected={node.id === selected}>
                    <input
                        type="radio"
                        name={name}
                        value={node.id}
                        checked={node.id === selected}
                        on:change={() => dispatch("select", node.id)}
                    />
                    {node.name}
                </label>
            {/if}
        </li>
    {/each}
</ul>

<style>
    .chart-tree {
        margin: 0;
        padding-left: 0;
        list-style: none;
    }

    details > :global(ul) {
        padding-left: 1.25rem;
    }

    summary {
        cursor: pointer;
        padding: 2px 0;
    }

    label {
        display: block;
        margin: 0;
        padding: 2px 0;
        cursor: pointer;
    }

    label.selected {
        font-weight: 600;
    }

    input {
        margin-right: 0.4rem;
    }
</style>
