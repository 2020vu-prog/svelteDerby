  <script>
  import { raceConfig } from './stores.js';
    import { store} from './stores/auth.js'
    import { Auth } from 'aws-amplify';

  import axios from "axios";


    function handleSubmit() {
        console.log("Adding:"+JSON.stringify(loginForm))
        //const currentSession = await Auth.currentSession();
         Auth.currentSession(); // refresh token. TODO: await!

        const req={
            orgId:$raceConfig.orgId,
            number:loginForm.carNumber,
            name:loginForm.driverName,
        }
        const bearer=$store.signInUserSession.idToken.jwtToken
        
        console.log("token:"+ bearer)

        axios.defaults.headers.common['Authorization'] = bearer;

                axios.post($raceConfig.baseUrl+'/addParticipant', req)
                .then((response) => {
                    console.log("driverAdd axios success")
                })
                .catch((err) => {
                    console.log("driverAdd failed: "+err)
                })
        loginForm.driverName="";
        loginForm.carNumber="";
    }
    const loginForm={
    }
    </script>
          <h3>Add Driver</h3>

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
