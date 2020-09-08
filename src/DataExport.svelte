<script>

    import SpinnerButton from "./SpinnerButton.svelte";
    import { db } from "./eventDb.js";
    var exportSpinning = false;
    async function doExport() {

        exportSpinning = true;
        await doExportTable("Participant");
        await doExportTable("RacePhase");
        exportSpinning = false;
    }
    async function doExportTable(tbl) {

        exportSpinning = true;
        const rows = await db[tbl].toArray();
        download(`${tbl}.json`, JSON.stringify(rows, null, 2));
        exportSpinning = false;
    }
    function download(filename, text) {

        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    }

</script>
<h3>Data Export</h3>

<SpinnerButton on:click={doExport} spinning={exportSpinning}>
    Data Export
</SpinnerButton>
