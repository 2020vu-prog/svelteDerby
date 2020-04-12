"use strict";

const fs = require('fs');
const parse = require('csv-parse')

// Using the first line of the CSV data to discover the column names
const ddir = __dirname+'/../s3ChartData/AASBD/Double/06double';
const rs = fs.createReadStream(`${ddir}.csv`);
const pjson = JSON.parse(fs.readFileSync(`${ddir}.json`));
console.log(pjson)
pjson.seeds=[];
pjson.progress={};

const seedRx = /^seed/i;


const main=()=>{
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
		fs.writeFileSync(`${ddir}.combined`,JSON.stringify(pjson));
	});

	rs.pipe(parser);
};
main();
