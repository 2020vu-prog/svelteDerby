
const { CfBase, getData, postData, getHHMMSS } = require("./common.js");
const { v4: uuidv4 } = require("uuid");

// from: https://github.com/d3/d3-interpolate/blob/main/src/round.js
const d3InterpolateNumber=function(a, b) {
  return a = +a, b = +b, function(t) {
    return Math.round(a * (1 - t) + b * t);
  };
}
function getRpiPct(lo,hi,actual){
	
	const range=hi-lo
	return (actual -lo )/range
}

test("i0: ", () => {
	rpiLo=44000
	rpiHi=44500
	rpiTick=44602

      const gps= d3InterpolateNumber(5000, 5900);
      const rpi= d3InterpolateNumber(rpiLo, rpiHi);
      const piPct=getRpiPct(rpiLo,rpiHi,rpiTick)
	



    console.log("piPct: ", piPct);
    console.log("gps: ", gps(piPct));
    //expect((data.uuid).length).toBeGreaterThan(0);
    //expect((data.uuid).length).toEqual(36);
});
