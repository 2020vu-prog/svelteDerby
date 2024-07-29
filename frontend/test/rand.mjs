    
    import log from "loglevel";
    import prand from 'pure-rand';
import crypto from 'crypto'

log.setLevel(0)

function shaSeed(pseed){
            const sha = crypto
                .createHash("sha256")
                .update(pseed+'')
                .digest("hex");
	const shaNum=parseInt(sha.substring(0, 16),16)
        log.debug(`shaSeed ${pseed} sha: ${sha} `);
        log.debug(`shaSeed ${pseed} shaNum: ${shaNum} `);
	//return Math.floor(shaNum);
	return (shaNum);
}
    function getPrngCars(seed, carList){
        log.debug(`ChartFill getPrngCars ${seed} input: `, carList);
	seed=shaSeed(seed)
        const g = prand.xoroshiro128plus(seed);
        const rand = (min, max) => {
            return prand.unsafeUniformIntDistribution(min, max, g);
        };
        fisherYates(carList, rand);
        log.debug(`ChartFill getPrngCars ${seed}  gave: `, carList);
    }
    function fisherYates(data, rand) {
  // for i from n−1 downto 1 do
  //j ← random integer such that 0 ≤ j ≤ i
  //exchange a[j] and a[i]
  for (let i = data.length - 1; i >= 1; --i) {
    const j = rand(0, i); // such that 0 ≤ j ≤ i
    const tmp = data[j];
    data[j] = data[i];
    data[i] = tmp;
  }
}
function dumpJson(l) {
	for (var i = 0; i < l.length; i++) {
		const j={
			car:l[i],
			pos:i,
		}
		//log.debug(`dumpJson ${i}  gave: ${l[i]}`, l);
		console.log(JSON.stringify(j))
	}
	
}

    function t1(pseed) {
	const cars=10

	const loadMe= [...Array(cars).keys()]
        const prngSeedList=[
            pseed-Math.floor(Math.random() *60000),
            pseed,
            (pseed-700) ^ (Math.random() * 0x100000000),
            pseed ^ (Math.random() * 0x100000000),
	    4,
            (Math.random() * 0x100000000),
            (Math.random() * 0x100000000),
	    42,43,44,
        ]
        for (const prngSeed of prngSeedList) {
            getPrngCars(prngSeed, loadMe);
        }
	    dumpJson(loadMe);

}
var pseed=            new Date().getTime()
for (var i = 1; i <= 10000; i++) {
	//const seed = Date.now() ^ (Math.random() * 0x100000000);
	t1(pseed +i )
}
