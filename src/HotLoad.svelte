<script>
  import axios from "axios";
  import { driverMap, nextOnBlockKey, doRefreshBlocks, standingsMap, racePhaseMap } from './stores.js';
  import { store } from './stores/auth.js'
  import { raceConfig } from './stores.js';
  import { Auth } from 'aws-amplify';
  import Amplify, { PubSub } from 'aws-amplify';
  import { AWSIoTProvider } from '@aws-amplify/pubsub/lib/Providers';

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

  var subscription=undefined;
  const watchIot = () => {


    Amplify.addPluggable(new AWSIoTProvider({
      aws_pubsub_region: 'us-east-2',
      aws_pubsub_endpoint: 'wss://a1fobetfjrk30o-ats.iot.us-east-2.amazonaws.com/mqtt',
    }));

    /*
    Auth.currentCredentials().then((info) => {
      const cognitoIdentityId = info.data.IdentityId;
      console.log("auth idid:", cognitoIdentityId)
    });
    */

    const topic = "derby/" + $raceConfig.orgId + "/dist"
    if(subscription){
      console.log("UnSubscribing", subscription)

      subscription.unsubscribe()
    }
    console.log("Subscribing to:", topic)

    subscription=PubSub.subscribe(topic).subscribe({
      next: data => {
        console.log('Message received', data);
        console.log('Message value', data.value);
        applyFromMqMsg(data.value);
      },
      error: error => console.error('AWS iot error:', error),
      close: () => console.log('AWS iot Done'),
    });
  }



  // called when a message arrives

  const sortBy = (field, reverse, primer) => {
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

  const applyFromMqMsg = (json) => {
    const hist=getHistFromStore();
    const entityFactory = new EntityFactory({});
    const e = entityFactory.build(json);
    console.log("Entity from mq:", e)
    applyEntityToHist(e, hist);
    applyHistToStore(hist);
  }
  const applyHistToStore = (hist) => {
    $driverMap = hist.Participant;


    $nextOnBlockKey = getNextOnBlockKeyFromRP(hist.RacePhase)
    //const sortedStandings=Object.values(hist.RaceStanding).sort(sortBy('lastUpdate', true, parseInt));
    $standingsMap = hist.RaceStanding;

    //const sortedPhases=Object.values(hist.RacePhase).sort(sortBy('lastUpdate', true, parseInt));
    //racePhaseMap.set(hist.RacePhase)
    $racePhaseMap = hist.RacePhase
    console.log("HotLoad: rpm now:", Object.keys(hist.RacePhase));

    $doRefreshBlocks = new Date().getTime()
    console.log("HotLoad: updated doRefreshBlocks");
  };
  const getHistFromStore = () => {
    return {
      Participant: $driverMap,
      RacePhase: $racePhaseMap,
      RaceStanding: $standingsMap
    }
  };

  /*
  **
  */
  const parseAndApply = (response) => {
    const entityFactory = new EntityFactory({});

    const hist = getHistFromStore();
    entityFactory.entityTypes.forEach(et => {
      console.log("et:", et)
      hist[et] = {};
    });


    for (var i = 0; i < response.data.length; i++) {

      const json = response.data[i];
      const e = entityFactory.build(json);
      applyEntityToHist(e, hist);
    }
    applyHistToStore(hist);

    return hist;
  }
  const applyEntityToHist = (e, hist) => {
    console.log("entity", e);
    const sk = e.classKey;
    const pk = e.classType;

    const tblHist = hist[pk];

    if (tblHist[sk] && tblHist[sk].lastUpdate > e.lastUpdate) { }
    else {
      tblHist[sk] = e;
    }
  }
  const getNextOnBlockKeyFromRP = (rpTmp) => {
    console.log("rpTmp:", rpTmp)
    //TODO: sort after filter!
    const onBlocks = Object.values(rpTmp).filter(rp => (!rp.phaseResults));
    if (onBlocks.length > 0) {
      console.log("set new nob:", onBlocks[0])
      return onBlocks[0].classKey;
    } else {
      return {};
    }
  }
  const doRefresh = async () => {
    watchIot();
    console.log("old nobKey:", $nextOnBlockKey)
    const currentSession = await Auth.currentSession();
    const bearer = currentSession.idToken.jwtToken;
    if ($raceConfig.orgId && $raceConfig.orgIz) { }
    else {
      console.log("no selected race");
      return;
    }

    axios.defaults.headers.common['Authorization'] = bearer;
    axios.get($raceConfig.baseUrl + "/getRaceHistory?orgId=" + $raceConfig.orgId + "&orgIz=" + $raceConfig.orgIz)
      .then((response) => {
        console.log("history:" + response.data.length);
        //console.log("history:",response.data);

        const hist = parseAndApply(response);


      })
      .catch((err) => {
        console.log(err);
      })
  };
</script>

<button class="btn {btnClass}" type="button" on:click|preventDefault={doRefresh}>
  Refresh
</button>