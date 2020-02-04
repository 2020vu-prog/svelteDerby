<script>
import  Router from 'svelte-spa-router'
import  {link} from 'svelte-spa-router'
import Standing from './Standing.svelte'
import DriverList from './DriverList.svelte'
import HotLoad from "./HotLoad.svelte";


const routes = {
    // Exact path
    '/': Standing,
    '/drivers': DriverList,
}
</script>


<body>
<HotLoad/>


    <a href="/drivers" use:link>Drivers</a>
    |
    <a href="/" use:link>Standings</a>

    <Router {routes}/>
</body>