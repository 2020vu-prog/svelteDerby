console.log("pwd:",process.cwd());

const EntityFactory = require("../modules/lambdaDerby/src/shared/EntityFactory.js");
const entityFactory = new EntityFactory();


//const AnnounceResults = require("./AnnounceResults.js");
//const announceResults = new AnnounceResults();


/*
const aPhaseJSON = {
    "at": 1593883407005,
    "by": "2020vu@gmail.com",
    "cn": [
      "100",
      "101"
    ],
    "orgId": "Test.e8c88",
    "ph1": [
      0,
      44
    ],
    "PK": "Test.e8c88:RS",
    "SK": "1593883391826",
    "TTL": 1593969415
  };

  const aPhaseRS = entityFactory.build(aPhaseJSON);

*/
test("A Phase Result Announcement", () => {
    //expect(announceResults.announceResults(aPhaseRS)).toStrictEqual("foo");
});
