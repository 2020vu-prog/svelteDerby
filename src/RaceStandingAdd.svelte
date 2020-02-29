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
              cn:[loginForm.car1+"", loginForm.car2+""],
          }
          const bearer=$store.signInUserSession.idToken.jwtToken
          
          console.log("token:"+ bearer)
  
          axios.defaults.headers.common['Authorization'] = bearer;
  
                  axios.post($raceConfig.baseUrl+'/addPending', req)
                  .then((response) => {
                      console.log("addPending axios success")
                  })
                  .catch((err) => {
                      console.log("addPending failed: "+err)
                  })
          loginForm.car1="";
          loginForm.car2="";
      }
      const loginForm={
      }
      </script>
      <h3>Add Pending Race</h3>
    <form on:submit|preventDefault={handleSubmit}>
      <label>
        <input type="number" bind:value={loginForm.car1} placeholder="Car1"/>
      </label>
          <label>
        <input type="number" bind:value={loginForm.car2} placeholder="Car2"/>
      </label>
      <button type="submit">Add</button>
      </form>
  