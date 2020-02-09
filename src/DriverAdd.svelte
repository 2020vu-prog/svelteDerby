  <script>
  import { raceConfig } from './stores.js';
    import { store} from './stores/auth.js'

  import axios from "axios";
    function handleSubmit() {
        console.log("Adding:"+JSON.stringify(loginForm))
        const createdBy=$store.username

        const req={
            orgId:$raceConfig.orgId,
            carNumber:loginForm.carNumber,
            name:loginForm.driverName,
            by:createdBy,
        }
        const bearer=$store.signInUserSession.idToken.jwtToken
        
        console.log("token:"+ bearer)
        axios.defaults.headers.common['Authorization'] = "Bearer "+bearer;

                axios.post($raceConfig.baseUrl+'/addParticipant', req)
                .then((response) => {
                    console.log("driverAdd axios success")
                })
                .catch((err) => {
                    console.log("driverAdd failed: "+err)
                })
    }
    const loginForm={
    }
    </script>
  <form on:submit|preventDefault={handleSubmit}>
    <label>
      Driver:
      <input type="text" bind:value={loginForm.driverName} placeholder="Driver Name"/>
    </label>
        <label>
      Car Number:
      <input type="number" bind:value={loginForm.carNumber} placeholder="Car Number"/>
    </label>
    <button type="submit">Add</button>
    </form>