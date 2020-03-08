<script>
  import axios from "axios";
  import { driverMap, nextOnBlockKey, doRefreshBlocks, standingsMap, racePhaseMap } from './stores.js';
  import { store } from './stores/auth.js'
  import { raceConfig } from './stores.js';
  import { Auth } from 'aws-amplify';

  const EntityFactory = require('../backend/modules/lambdaDerby/src/shared/EntityFactory.js')

  const nextPhaseTopic = "nextPhase";
  const iosTriggerTopic = "iosTrigger";
  var client;
  var btnClass = "btn-danger";
  function guid() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
      s4() + '-' + s4() + s4() + s4();
  }
  function initWebsocket(host, port) {
    // Create a client instance
    //client = new Paho.MQTT.Client("174.138.79.223", Number(9001), "broswer."+guid());
    // client = new Paho.MQTT.Client(host,Number(port), "browser."+guid());
    client = new Paho.MQTT.Client("wss://" + host + ":" + port + "/mqtt", "browser." + guid());


    // set callback handlers
    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;

    // connect the client
    client.connect({
      onSuccess: onConnect,
      keepAliveInterval: 7200,
      cleanSession: true
    });
  }


  axios.get('./data/mqtt.json')
    .then((response) => {

      mqttJsonSuccess(response.data)
    })
    .catch((err) => {
      mqttJsonError(err);
    })

  function mqttJsonError(data) {
    console.log("mqttJsonError:" + data);
  }
  function mqttJsonSuccess(data) {
    console.log("mqttJsonSuccess:" + data);
    console.log("mqttJsonSuccess host:" + data.host);
    console.log("mqttJsonSuccess port:" + data.port);

    initWebsocket(data.host, data.port);

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
      console.log("onConnectionLost:" + responseObject.errorMessage);
    }
  }

  // called when a message arrives
  function onMessageArrived(message) {
    console.log("onMessageArrived: from topic: " + message.destinationName + " payload: " + message.payloadString);
    try {
      const parsed = JSON.parse(message.payloadString)
      console.log("onMessageArrived: parsed: " + parsed);

      if (nextPhaseTopic === message.destinationName) {
        //$nextOnBlocks = parsed;
        $doRefreshBlocks = new Date().getTime()

        return;
      }
      if (iosTriggerTopic === message.destinationName) {
        btnClass = "btn-primary";
        doRefresh();
        return;
      }

    }
    catch (err) {
      console.log("mqtt parse error:" + err)
    }

  }
  const sortBy = (field, reverse, primer) =>{
    var key = primer ?
        function (x) {
            return primer(x[field])
        } :
        function (x) {
            return x[field]
        };

    reverse = !reverse ? 1 : -1;

    return function (a, b) {
        return a = key(a), b = key(b), reverse * ((a > b) - (b > a));
    }
};
  const parseAndApply = (response) => {
    const entityFactory = new EntityFactory({});

    const hist = {}
    entityFactory.entityTypes.forEach(et => {
      console.log("et:", et)
      hist[et] = {};
    });


    for (var i = 0; i < response.data.length; i++) {

      const json = response.data[i];
      const e = entityFactory.build(json);
      console.log("entity", e);
      const sk = e.classKey;
      const pk = e.classType;

      const tblHist = hist[pk];

      if (tblHist[sk] && tblHist[sk].lastUpdate > e.lastUpdate) { }
      else {
        tblHist[sk] = e;
      }
    }

    return hist;
  }
  const getNextOnBlockKeyFromRP = (rpTmp) => {
    console.log("rpTmp:", rpTmp)
    //TODO: sort after filter!
    const onBlocks=Object.values(rpTmp).filter(rp => (!rp.phaseResults));
    if (onBlocks.length > 0) {
      console.log("set new nob:", onBlocks[0])
      return onBlocks[0].classKey;
    } else {
      return {};
    }
  }
  const  doRefresh = async () => {
    console.log("old nobKey:", $nextOnBlockKey)
    const currentSession = await Auth.currentSession();
    const bearer=currentSession.idToken.jwtToken;


    axios.defaults.headers.common['Authorization'] = bearer;
    axios.get($raceConfig.baseUrl + "/getRaceHistory?orgId=" + $raceConfig.orgId)
      .then((response) => {
        console.log("history:" + response.data.length);
        //console.log("history:",response.data);

        const hist = parseAndApply(response);
        driverMap.set(hist.Participant);


        nextOnBlockKey.set(getNextOnBlockKeyFromRP(hist.RacePhase));
        //const sortedStandings=Object.values(hist.RaceStanding).sort(sortBy('lastUpdate', true, parseInt));
        standingsMap.set(hist.RaceStanding);

        //const sortedPhases=Object.values(hist.RacePhase).sort(sortBy('lastUpdate', true, parseInt));
        racePhaseMap.set(hist.RacePhase)

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