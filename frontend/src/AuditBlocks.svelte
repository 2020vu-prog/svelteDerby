<script>
    import log from "loglevel";
    import LogList from "./LogList.svelte";
    import {
        nextOnBlockKey,
        standingsMap,
        doRefreshBlocks,
    } from "./stores.js";
    import { 
        isPendingNeededForType ,
        getEntityFactory,
    } from "./utils.js";
    import EntityFactory from "../../backend/modules/lambdaDerby/src/shared/EntityFactory.js";
    export let carNumberForm={};

        let neededForType=isPendingNeededForType(carNumberForm.promptPhaseType)
        let c1=carNumberForm.car1
        let c2=carNumberForm.car2
        
    let msgs=[]
    var blocksOccupied = true;
    $: {
        blocksOccupied = $nextOnBlockKey.length > 0;
    }
    $:{
        neededForType=isPendingNeededForType(carNumberForm.promptPhaseType)
        c1=carNumberForm.car1
        c2=carNumberForm.car2
        recalcMessages(carNumberForm,$doRefreshBlocks)
    }
    $:{
        log.warn(`cnf: `,carNumberForm)
    }
    function lanesOK(pendingRs){
        const entityFactory=getEntityFactory()
        const rs = entityFactory.build(pendingRs);
        log.warn(`nextRace(): `,rs )
        const formCars=[c1,c2]
        if (rs.nextRace().toString() == formCars.toString()) {
            return true
        }else{
            return false
        }

    }
    function recalcMessages(carNumberForm,$doRefreshBlocks){
        msgs=[]
       // msgs.push({msg:new Date().getTime(),level: log.levels.DEBUG})
        msgs.push({msg: `c1: ${c1}`,level: log.levels.DEBUG})
        msgs.push({msg: `c2: ${c2}`,level: log.levels.DEBUG})
        msgs.push({msg: `pt: ${carNumberForm.promptPhaseType} needed: ${neededForType}`,level: log.levels.DEBUG})

        msgs.push({msg: `Pending len: ${getPendings().length}`,level:log.levels.DEBUG})

        if(!c1 && !c2){
                msgs.push({msg: `At least 1 car needed.`,level:log.levels.ERROR})
                return;
        }
        if(c1 == c2){
                msgs.push({msg: `Same car in both lanes.`,level:log.levels.ERROR})
                return;
        }
        const pendingRs=twoCarsPending()
        if(pendingRs){
            if(neededForType){
                if(lanesOK(pendingRs)){
                    msgs.push({msg: `Pending found for cars.`,level:log.levels.INFO})
                }else{
                    msgs.push({msg: `Pending found for cars. Lanes reversed?`,level:log.levels.ERROR})
                }
            } else{
                msgs.push({msg: `Pending found. Should this be a race?`,level:log.levels.WARN})
            }
        }else{
            if(neededForType){
                msgs.push({msg: `Pending missing.`,level:log.levels.WARN})
            } else{
                msgs.push({msg: `Pending missing.`,level:log.levels.INFO})
            }

        }
        msgs.push({msg: `2Pending: ${twoCarsPending()}`})
        if(blocksOccupied){
            msgs.push({msg: `Blocks occcupied.`,level:log.levels.ERROR})
        }


    }
    function isCarPending(rs,car1,car2){
        
        if (car1 && car2 &&
        rs.cn.find(c=>c===car1 ) &&
        rs.cn.find(c=>c===car2 )
        ){
            return true
        }
        else{
            return false
        }
    }
    function twoCarsPending(){
        const p=getPendings();
        return p.find((rs)=>isCarPending(rs,carNumberForm.car1,carNumberForm.car2))

    }
    function getPendings(carFilter, drb) {
        const rc = Object.values($standingsMap);
        return rc
            .filter((rs) => rs.isPending())
            .filter(rs=>!rs.del)
    }
</script>
<LogList {msgs}/>


