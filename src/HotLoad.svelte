<script>
import axios from "axios";
import { driverMap,nextOnBlocks, doRefreshBlocks} from './stores.js';
import { store} from './stores/auth.js'
import { raceConfig } from './stores.js';

const EntityFactory = require('../backend/modules/lambdaDerby/src/shared/EntityFactory.js')

const nextPhaseTopic="nextPhase";
const iosTriggerTopic="iosTrigger";
var client;
var btnClass="btn-danger";
function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}
function initWebsocket(host,port){
        // Create a client instance
        //client = new Paho.MQTT.Client("174.138.79.223", Number(9001), "broswer."+guid());
       // client = new Paho.MQTT.Client(host,Number(port), "browser."+guid());
client = new Paho.MQTT.Client("wss://"+host+":"+port+"/mqtt", "browser."+guid());


        // set callback handlers
        client.onConnectionLost = onConnectionLost;
        client.onMessageArrived = onMessageArrived;

        // connect the client
        client.connect( {
                onSuccess:onConnect,
                keepAliveInterval: 7200,
                cleanSession:true
        });
}


	axios.get('./data/mqtt.json')
		.then((response) => {

                mqttJsonSuccess(response.data)
		})
		.catch((err) => {
							mqttJsonError(err);
		})

function mqttJsonError(data){
          console.log("mqttJsonError:"+data);
}
function mqttJsonSuccess(data){
        console.log("mqttJsonSuccess:"+data);
        console.log("mqttJsonSuccess host:"+data.host);
        console.log("mqttJsonSuccess port:"+data.port);

        initWebsocket(data.host,data.port);

}

// called when the client connects
function onConnect() {
  // Once a connection has been made, make a subscription and send a message.
  console.log("onConnect");
  client.subscribe(iosTriggerTopic);
  client.subscribe(nextPhaseTopic);
}

// called when the client loses its connection
function onConnectionLost(responseObject) {
  if (responseObject.errorCode !== 0) {
    console.log("onConnectionLost:"+responseObject.errorMessage);
  }
}

// called when a message arrives
function onMessageArrived(message) {
  console.log("onMessageArrived: from topic: "+ message.destinationName + " payload: "+message.payloadString);
  try{
    const parsed=JSON.parse(message.payloadString)
    console.log("onMessageArrived: parsed: "+parsed);

    if(nextPhaseTopic=== message.destinationName ){
        $nextOnBlocks=parsed;
        $doRefreshBlocks=new Date().getTime()

        return;
    }
    if(iosTriggerTopic=== message.destinationName ){
        btnClass="btn-primary";
        doRefresh();
        return;
    }

  }
  catch(err){
      console.log("mqtt parse error:"+err)
  }
        
}
const parseAndApply=(response)=>{
  const entityFactory=new EntityFactory({});
    const driverTmp={}
    const rpTmp={}

    for(var i=0;i<response.data.length;i++){

      const ej=response.data[i];
      const e=entityFactory.build(ej);
      console.log("vanillaJ",ej);
      console.log("vanilla",e);

      if(ej.PK.endsWith(":PTCP") ){
        console.log("participant",e);
        console.log("participant",e.number);
        console.log("participant",e.name);
        driverTmp[e.number]=e;

      }
      if(ej.PK.endsWith(":RP") ){
        const sk=ej.SK;
        console.log("rp:",e);
        console.log("rp cars",e.carNumbers);
        console.log("rp.phase",e.phaseLiteral);
        if(! rpTmp[sk]){
          rpTmp[sk]=e;
        }
        else{
            if(rpTmp[sk].lastUpdate< e.lastUpdate){
              rpTmp[sk]=e;
            }
        }
      }
    }

    return [driverTmp,rpTmp]
  }
const doRefresh=()=>{
  console.log("old nob:",$nextOnBlocks)

    const bearer=$store.signInUserSession.idToken.jwtToken

    console.log("token:"+ bearer)

    axios.defaults.headers.common['Authorization'] = bearer;
  axios.get($raceConfig.baseUrl+"/getRaceHistory?orgId="+$raceConfig.orgId)
  .then((response) => {
    console.log("history:"+response.data.length);
    //console.log("history:",response.data);
   
    const [driverTmp,rpTmp]=parseAndApply(response);
    driverMap.set(driverTmp);

    console.log("rpTmp:",rpTmp)
    if(Object.keys(rpTmp).length>0){
      const nobKey=Object.keys(rpTmp)[0];
      const nob=rpTmp[nobKey]
      console.log("set new nob:",nob)
      nextOnBlocks.set(nob); // TODO: get actual next!
    }else{
      nextOnBlocks.set({}); // TODO: get actual next!

      }
      doRefreshBlocks.set(new Date().getTime())

  })
  .catch((err) => {
                      console.log(err);
  })
};
</script>

<button class="btn {btnClass}" type="button" on:click|preventDefault={doRefresh}>
  Refresh
</button>