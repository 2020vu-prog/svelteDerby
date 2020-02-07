<script>
import axios from "axios";
import { doRefresh,nextOnBlocks, doRefreshBlocks} from './stores.js';

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
</script>

<button class="btn {btnClass}" type="button" disabled>
</button>