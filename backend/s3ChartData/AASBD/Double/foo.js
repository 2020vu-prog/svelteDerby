const brackets = {
    imgSize: {
        height: 1700,
        width: 2200,
    },
    seeds: [
        {
            pos: "seedx",
            left: "0",
            top: "0",
        },

        {
            pos: "01A",
            left: "132",
            top: "430",
        },
        {
            pos: "01B",
            left: "132",
            top: "726",
        },
        {
            pos: "02A",
            left: "132",
            top: "816",
        },
        {
            pos: "02B",
            left: "132",
            top: "1125",
        },
        {
            pos: "03A",
            left: "315",
            top: "564",
        },
        {
            pos: "03B",
            left: "315",
            top: "771",
        },
        {
            pos: "04A",
            left: "315",
            top: "954",
        },
        {
            pos: "04B",
            left: "315",
            top: "1182",
        },
        {
            pos: "08A",
            left: "492",
            top: "681",
        },
        {
            pos: "08B",
            left: "492",
            top: "1062",
        },
        {
            pos: "05A",
            left: "1857",
            top: "432",
        },
        {
            pos: "05B",
            left: "1857",
            top: "582",
        },
        {
            pos: "06A",
            left: "1857",
            top: "699",
        },
        {
            pos: "06B",
            left: "1857",
            top: "850",
        },
        {
            pos: "07A",
            left: "1686",
            top: "486",
        },
        {
            pos: "07B",
            left: "1686",
            top: "771",
        },
        {
            pos: "09A",
            left: "1500",
            top: "573",
        },
        {
            pos: "09B",
            left: "1500",
            top: "819",
        },
        {
            pos: "10A",
            left: "675",
            top: "873",
        },
        {
            pos: "10B",
            left: "1245",
            top: "700",
        },
        {
            pos: "11A",
            left: "1150",
            top: "1055",
        },
        {
            pos: "11B",
            left: "1150",
            top: "1125",
        },
        {
            pos: "502A",
            left: "1506",
            top: "1164",
        },
        {
            pos: "502B",
            left: "1506",
            top: "1263",
        },
    ],
};

const oo = {};
oo.imgSize = brackets.imgSize;
oo.positions = {};
for (var i = 0; i < brackets.seeds.length; i++) {
    const seed = brackets.seeds[i];
    const pos = seed.pos;
    delete seed.pos;
    oo.positions[pos] = seed;
}
console.log(JSON.stringify(oo));
