<script>
import axios from "axios";
import { doRefresh,nextOnBlocks} from './stores.js';

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
  client.subscribe("iosTrigger");
  client.subscribe("nextOnBlocks");
}

// called when the client loses its connection
function onConnectionLost(responseObject) {
  if (responseObject.errorCode !== 0) {
    console.log("onConnectionLost:"+responseObject.errorMessage);
  }
}

// called when a message arrives
function onMessageArrived(message) {
  console.log("onMessageArrived:"+message.payloadString);
  const parsed=JSON.parse(message.payloadString)
    console.log("onMessageArrived: parsed: "+parsed);

    if(parsed.loadMS){
        $nextOnBlocks=parsed;
        return;
    }
             btnClass="btn-primary";

                doRefresh();
        
}
</script>

<button class="btn {btnClass}" type="button" disabled>
</button>