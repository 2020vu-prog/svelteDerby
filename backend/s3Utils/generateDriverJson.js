"use strict";
const { resolve } = require("path");
const { readdir } = require("fs").promises;
const fs = require("fs");
const parse = require("csv-parse");

async function getFiles(dir) {
    const dirents = await readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
        dirents.map((dirent) => {
            const res = resolve(dir, dirent.name);
            return dirent.isDirectory() ? getFiles(res) : res;
        })
    );
    return Array.prototype.concat(...files);
}

const driverDir = __dirname + "/../s3DriverData";
const main = async () => {
    var candidates = await getFiles(driverDir);
    candidates = candidates.filter((file) => /csv$/.test(file));
    console.log("driverDir candidates: ", candidates);

    for (let idx in candidates) {
        await doOne(candidates[idx]);
    }

    return "main finished.";
};
const doOne = async (tgt) => {
    // Using the first line of the CSV data to discover the column names
    console.log("Begin: tgt:", tgt);
    const baseDirAndFile = tgt.replace(/\..*/, "");
    console.log("baseDirAndFile:", baseDirAndFile);

    const orgIz = "Test";
    const orgId = "Test.4b117";
    const outJson = {
        //orgId: orgId,
        //orgIz: orgIz,
        //bulk: [],
    };
    const rs = fs.createReadStream(`${baseDirAndFile}.csv`);

    const parser = parse({ columns: true, relax_column_count: true }, function (
        err,
        data
    ) {
        if (err) console.log("err:", err);
        if (data) console.log("data:", data);
        for (let idx in data) {
            const r = data[idx];
            console.log("driver: ", r);
            console.log(`${JSON.stringify(r)}\n`);
            if (r.CarNumber && r.ShortName) {
                const driver = {
                    orgId: orgId,
                    orgIz: orgIz,
                    PK: `${orgId}:PTCP`,
                    name: r.ShortName,
                    number: r.CarNumber,
                };
                //outJson.bulk.push(driver);
                outJson[r.CarNumber]={
                    orgId: orgId,
                    orgIz: orgIz,
                    PK: `${orgId}:PTCP`,
                    name: r.ShortName,
                    number: r.CarNumber,
		};
            }
        }

        console.log(JSON.stringify(outJson));
        fs.writeFileSync(
            `${baseDirAndFile}.json`,
            JSON.stringify(outJson, null, "\t")
        );
    });

    const pout = rs.pipe(parser);
    //	console.log("pout:", pout);
    //   await new Promise(fulfill => stream.on("finish", fulfill));
};
main().then(console.log).catch(console.error);
