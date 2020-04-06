<script>
    import ChartHotSpot from "./ChartHotSpot.svelte";

    const brackets = {
        imgSize: {
            height: 1700,
            width: 2200
        },
        seeds: [
            {
                pos: "seedx",
                left: "0",
                top: "0"
            },

            {
                pos: "01A",
                left: "132",
                top: "430"
            },
            {
                pos: "01B",
                left: "132",
                top: "726"
            },
            {
                pos: "02A",
                left: "132",
                top: "816"
            },
            {
                pos: "02B",
                left: "132",
                top: "1125"
            },
            {
                pos: "03A",
                left: "315",
                top: "564"
            },
            {
                pos: "03B",
                left: "315",
                top: "771"
            },
            {
                pos: "04A",
                left: "315",
                top: "954"
            },
            {
                pos: "04B",
                left: "315",
                top: "1182"
            },
            {
                pos: "08A",
                left: "492",
                top: "681"
            }, {
                pos: "08B",
                left: "492",
                top: "1062"
            },
            {
                pos: "05A",
                left: "1857",
                top: "432"
            },
            {
                pos: "05B",
                left: "1857",
                top: "582"
            },
            {
                pos: "06A",
                left: "1857",
                top: "699"
            },
            {
                pos: "06B",
                left: "1857",
                top: "850"
            },
            {
                pos: "07A",
                left: "1686",
                top: "486"
            }, {
                pos: "07B",
                left: "1686",
                top: "771"
            },
            {
                pos: "09A",
                left: "1500",
                top: "573"
            },
            {
                pos: "09B",
                left: "1500",
                top: "819"
            },
            {
                pos: "10A",
                left: "675",
                top: "873"
            },
            {
                pos: "10B",
                left: "1245",
                top: "700"
            },
            {
                pos: "11A",
                left: "1150",
                top: "1055"
            },
            {
                pos: "11B",
                left: "1150",
                top: "1125"
            },
            {
                pos: "502A",
                left: "1506",
                top: "1164"
            },            {
                pos: "502B",
                left: "1506",
                top: "1263"
            },
        ]
    }
    let scale = 1;
    const gotoTimer = () => {
        console.log("gototimer")
        imgSize();
    }
    function imgSize() {
        var myImg = document.querySelector("#sky");
        var currWidth = myImg.clientWidth;
        var currHeight = myImg.clientHeight;
        console.log("Current width=" + currWidth + ", " + "Original height=" + currHeight);
        scale = .9 * scale;
        brackets.seeds = brackets.seeds;  // force re-render?

        myImg.style.width = (brackets.imgSize.width * scale) + "px";
        myImg.style.height = (brackets.imgSize.height * scale) + "px";

    }
</script>
<style>
    div.container {
        width: 100%;
        height: 30px;
        background: blue;
    }
</style>

<div id="top" class="container" style="z-index: 8;">

    {#each brackets.seeds as bracket}
    <ChartHotSpot pos={bracket.pos} scale={scale} left={bracket.left} top={bracket.top}/>
    {/each}
    <img style="position: absolute; z-index: 1; top:0px;left:0px;" id="sky" src="/archive/charts/double06.png" alt="double6" on:click={()=>gotoTimer()}/>

</div>