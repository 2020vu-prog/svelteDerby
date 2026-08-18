<script>
    import { spring } from "svelte/motion";

    import Pie from "./Pie.svelte";

    export let piePercent = 0;
    export let pieTitle = "Pie Progress";

    const ps = spring(0, { stiffness: 0.08, damping: 0.5 });

    $: {
        ps.set(piePercent);
    }
</script>

<div class="modal">
    <div class="modal-content">
        <p>{pieTitle}</p>
        <Pie size={150} percent={$ps} />
    </div>
</div>

<style>
    /* The Modal (background) */
    .modal {
        display: block;
        position: fixed;
        /* Stay in place */
        z-index: 1;
        /* Sit on top */
        left: 0;
        top: 0;
        height: 100%;
        /* Full height */
        overflow: auto;
        /* Enable scroll if needed */
        background-color: rgb(0, 0, 0);
        /* Fallback color */
        background-color: rgba(0, 0, 0, 0.4);
        /* Black w/ opacity */
        text-align: center;
    }

    /* Modal Content/Box */
    .modal-content {
        background-color: #fefefe;
        margin: 15% auto;
        /* 15% from the top and centered */
        padding: 20px;
        border: 1px solid #888;
        width: min-content;
    }
</style>
