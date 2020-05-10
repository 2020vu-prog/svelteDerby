"use strict";
const { resolve } = require('path');
const { readdir } = require('fs').promises;
const fs = require('fs');
const parse = require('csv-parse')

async function getFiles(dir) {
  const dirents = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFiles(res) : res;
  }));
  return Array.prototype.concat(...files);
}




const chartDir=__dirname+'/../s3ChartData';
const main=async()=>{
	var candidates=await getFiles(chartDir);
	candidates=candidates.filter(file => /json$/.test(file));
	candidates=candidates.filter(file => ! /combined.json$/.test(file));
	console.log("chartCandidates: ", candidates);

	for(let idx in candidates){
		await doOne(candidates[idx])
	}

	return "main finished.";
};
const doOne=async(tgt)=>{
	// Using the first line of the CSV data to discover the column names
	console.log("Begin: tgt:",tgt);
	const baseDirAndFile = tgt.replace(/\..*/,"");
	console.log("baseDirAndFile:",baseDirAndFile);

	const rs = fs.createReadStream(`${baseDirAndFile}.csv`);
	const pjson = JSON.parse(fs.readFileSync(`${baseDirAndFile}.json`));
	console.log("pjson:",pjson)
	pjson.seeds=[];
	pjson.progress={};

	const seedRx = /^seed/i;


	const parser = parse({columns: true, relax_column_count: true}, function(err, data){
	if(err) console.log("err:",err);
	if(data) console.log("data:",data);
		for(let idx in data){
		  const r=data[idx];
			if(seedRx.test(r["#Round"])){
				pjson.seeds.push(r["HeatNumber"]);
			}
			if(r.HeatNumber && r.WinnerDest && r.WinnerDest){
				pjson.progress[r.HeatNumber]=r;
			}

		  console.log(`${JSON.stringify(r)}\n`)
		}
		console.log(JSON.stringify(pjson))
		fs.writeFileSync(`${baseDirAndFile}.combined.json`,JSON.stringify(pjson,null,'\t'));
	});



	const pout=rs.pipe(parser);
//	console.log("pout:", pout);
 //   await new Promise(fulfill => stream.on("finish", fulfill));

}
main()
  .then(console.log)
  .catch(console.error)
