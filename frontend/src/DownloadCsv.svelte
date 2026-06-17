<script>
    import log from "loglevel";
    import { recalcLaneData } from "./utilsElapsed.js";
    import SpinnerButton from "./SpinnerButton.svelte";
    import { db, localConfigDb } from "./eventDb.js";
    import { tick } from "svelte";
    import { racePhaseMap ,raceConfig} from "./stores";
    import { isAllowedRoutePath, downloadFile } from "./utils.js";
    import { stringify as csvStringify } from "csv-stringify/sync";

    const onFileSelected = (e) => {
        //postDrivers(e.target.files[0])
        let jsonFile = e.target.files[0];
        let reader = new FileReader();
        reader.readAsBinaryString(jsonFile);
        reader.onload = (e) => {
            //avatar = e.target.result
            log.debug("OFS:", e.target.result);
            const obs = JSON.parse(e.target.result);
            db.TmpTimerElapsed.bulkPut(obs);
        };
    };
    let InputFileContentType = "application/json";
    async function uploadFinishBlockJson() {
        InputFileContentType = "application/json";
        await tick();
        document.getElementById("driverJsonFileTag").click();
    }
    const asyncForEach = async (array, callback) => {
        for (let index = 0; index < array.length; index++) {
            await callback(array[index], index, array);
        }
    };
    function captureKeys(known, current) {
        Object.keys(current).forEach((key) => (known[key] = current[key]));
    }
    async function downloadPhases() {
        const rows = [["At","By","Lane1","Lane2","Delta","Win Lane","Raw"]];
        await asyncForEach(Object.values($racePhaseMap), async function (rp) {
            if(rp.del){
                return
            }
            if(!rp.phr){
                return
            }
                const result=(rp.phr[1]-rp.phr[0])/1000
                const winLane=(result>0)?"Lane1":"Lane2"
            rows.push([
                new Date(rp.at).toLocaleString(),
                rp.by,
                rp.cn[0],
                rp.cn[1],
                result,
                winLane,
                rp.phr,
            ])
        });
        const output = csvStringify(rows, {
            quoted: true,
        });
        const text = output;
        downloadFile(`RR1-Phases-${$raceConfig.orgId}.csv`, text);
    }
    async function downloadElapsed() {
        const keys = {};
        const fmapList = [];
        await asyncForEach(Object.values($racePhaseMap), async function (rp) {
            const fbRecord = await db.TmpTimerElapsed.where("SK")
                .equals(rp.SK)
                .toArray();
            let fbJson;
            //let laneData=[]
            //let fmap={}
            if (fbRecord && fbRecord.length > 0) {
                log.debug("z:", fbRecord[0]);
                fbJson = JSON.parse(fbRecord[0].fbList);
                log.debug("fbJson:", fbJson);
                const [laneData, fmap] = recalcLaneData(fbJson, rp.cn);
                log.debug("fmap:", fmap);

                fmap.l1["000_Loaded"] = new Date(
                    parseInt(rp.SK)
                ).toLocaleString();
                fmap.l2["000_Loaded"] = new Date(
                    parseInt(rp.SK)
                ).toLocaleString();
                fmapList.push(fmap);
                captureKeys(keys, fmap.l1);
                captureKeys(keys, fmap.l2);
            }
        });
        const sortedKeyList = [...Object.keys(keys)];
        sortedKeyList.sort();
        const sortedTitleList = [];
        const stripSortSeq = /^\d\d\d_/;
        sortedKeyList.forEach((title) =>
            sortedTitleList.push(title.replace(stripSortSeq, ""))
        );
        const rows = [[...sortedTitleList]];
        function mapRow(obj) {
            const newRow = [];
            sortedKeyList.forEach((key) => newRow.push(obj[key]));
            return newRow;
        }
        fmapList.forEach((fmap) => {
            rows.push(mapRow(fmap.l1));
            rows.push(mapRow(fmap.l2));
        });

        log.debug("rows", JSON.stringify(rows));
        const output = csvStringify(rows, {
            quoted: true,
        });
        const text = output;
        downloadFile(`RR1-Elapsed-${$raceConfig.orgId}.csv`, text);
    }
</script>

<SpinnerButton on:click={uploadFinishBlockJson}
    >Upload FinishBlocks</SpinnerButton
>
<SpinnerButton on:click={downloadElapsed}>Download Elapsed</SpinnerButton>
<br />
<SpinnerButton on:click={downloadPhases}>Download Phases</SpinnerButton>

<!-- this is unstyled file input tag, so hide it!-->
<div style="height: 0px;width:0px; overflow:hidden;">
    <input
        id="driverJsonFileTag"
        name="driverJsonFileTag"
        accept={InputFileContentType}
        type="file"
        on:change={(e) => onFileSelected(e)}
    />
</div>
