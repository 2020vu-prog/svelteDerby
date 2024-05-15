<script>
        import log from "loglevel";
        import { recalcLaneData} from './utilsElapsed.js'
import SpinnerButton from "./SpinnerButton.svelte";
import { db, localConfigDb } from "./eventDb.js";
import { tick } from "svelte"
import { racePhaseMap } from "./stores"
import { isAllowedRoutePath , downloadFile} from "./utils.js";
import { stringify as csvStringify} from 'csv-stringify/lib/sync';

   const onFileSelected = (e) => {
        //postDrivers(e.target.files[0])
        let jsonFile = e.target.files[0];
        let reader = new FileReader();
        reader.readAsBinaryString(jsonFile);
        reader.onload = (e) => {
            //avatar = e.target.result
            log.debug("OFS:", e.target.result);
            const obs=JSON.parse(e.target.result)
            db.TmpTimerElapsed.bulkPut(obs)
        };
    };  
    let InputFileContentType="application/json" 
    async function uploadFbJson() {
        InputFileContentType="application/json"
        await tick()
        document.getElementById("driverJsonFileTag").click();
    }
    const asyncForEach = async (array, callback) => {
        for (let index = 0; index < array.length; index++) {
            await callback(array[index], index, array);
        }
    };
    function captureKeys(known,current){
        Object.keys(current).forEach(key=>known[key]=current[key])
    }
    async function downloadElapsed(){
            const keys={}
            const fmapList=[]
            await asyncForEach(Object.values( $racePhaseMap),async function(rp){
                const fbRecord=await db.TmpTimerElapsed.where('SK').equals(rp.SK).toArray()
                let fbJson
                //let laneData=[]
                //let fmap={}
                if(fbRecord&&fbRecord.length>0){
                    log.debug('z:',fbRecord[0])
                    fbJson=JSON.parse(fbRecord[0].fbList)
                    log.debug('fbJson:',fbJson)
                   const [laneData,fmap]=recalcLaneData(fbJson, rp.cn);
                    log.debug('fmap:',fmap)

                    fmap.l1['000_Loaded']=new Date(parseInt(rp.SK)).toLocaleString()
                    fmap.l2['000_Loaded']=new Date(parseInt(rp.SK)).toLocaleString()
                    fmapList.push(fmap)
                    captureKeys(keys,fmap.l1)
                    captureKeys(keys,fmap.l2)
                }

            })
            const sortedKeyList=[...Object.keys(keys)]
            sortedKeyList.sort();
            const sortedTitleList=[]
            const stripSortSeq=/^\d\d\d_/;
            sortedKeyList.forEach(title=>sortedTitleList.push(title.replace(stripSortSeq,"")))
            const rows=[[...sortedTitleList]]
                function mapRow(obj){
                    const newRow=[]
                    sortedKeyList.forEach(key=>newRow.push(obj[key]));
                    return newRow
                }
           fmapList.forEach(fmap=>{
                rows.push(mapRow(fmap.l1))
                rows.push(mapRow(fmap.l2))
           }); 


            log.debug("rows",JSON.stringify(rows))
            const output = csvStringify(rows,{
                quoted: true
            })
            const text = output 
            downloadFile('q.csv',text)

        }
</script>

<SpinnerButton on:click={uploadFbJson}>Upload FinishBlocks</SpinnerButton>
<SpinnerButton on:click={downloadElapsed}>Download Elapsed</SpinnerButton>

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
