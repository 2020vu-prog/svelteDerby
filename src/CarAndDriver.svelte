 <script>
import { standings,driverMap } from './stores.js';
export let carNumber;
const getDriverName =  ()=> {
        if (carNumber && $driverMap[ carNumber]) {
            return ($driverMap[carNumber].firstName);
        }
        else{
            return "";
        }
    };

</script>


<span>
<big><b>{carNumber}</b></big> {getDriverName()}
</span>