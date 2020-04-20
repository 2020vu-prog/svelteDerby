<script>
  import ChartHotSpot from "./ChartHotSpot.svelte";
  const brackets2 = {
    imgSize: { height: 1700, width: 2200 },
    imgPositions: {
      seedx: { left: "0", top: "0" },
      "01A": { left: "132", top: "430" },
      "01B": { left: "132", top: "726" },
      "02A": { left: "132", top: "816" },
      "02B": { left: "132", top: "1125" },
      "03A": { left: "315", top: "564" },
      "03B": { left: "315", top: "771" },
      "04A": { left: "315", top: "954" },
      "04B": { left: "315", top: "1182" },
      "08A": { left: "492", top: "681" },
      "08B": { left: "492", top: "1062" },
      "05A": { left: "1857", top: "432" },
      "05B": { left: "1857", top: "582" },
      "06A": { left: "1857", top: "699" },
      "06B": { left: "1857", top: "850" },
      "07A": { left: "1686", top: "486" },
      "07B": { left: "1686", top: "771" },
      "09A": { left: "1500", top: "573" },
      "09B": { left: "1500", top: "819" },
      "10A": { left: "675", top: "873" },
      "10B": { left: "1245", top: "700" },
      "11A": { left: "1150", top: "1055" },
      "11B": { left: "1150", top: "1125" },
      "502A": { left: "1506", top: "1164" },
      "502B": { left: "1506", top: "1263" }
    },
    seeds: ["01A", "02A", "03B", "04B", "02B", "01B"],
    progress: {
      "10": {
        "#Round": "Championship7",
        HeatNumber: "10",
        WinnerDest: "(AWINS?Place1:11B)",
        LoserDest: "(AWINS?Place2:11A)"
      },
      "11": {
        "#Round": "Championship7",
        HeatNumber: "11",
        WinnerDest: "Place1",
        LoserDest: "Place2"
      },
      "502": {
        "#Round": "Runoff",
        HeatNumber: "502",
        WinnerDest: "Place5",
        LoserDest: "Place6"
      },
      "01": {
        "#Round": "Left1",
        HeatNumber: "01",
        WinnerDest: "03A",
        LoserDest: "05A"
      },
      "02": {
        "#Round": "Left1",
        HeatNumber: "02",
        WinnerDest: "04A",
        LoserDest: "05B"
      },
      "03": {
        "#Round": "Left2",
        HeatNumber: "03",
        WinnerDest: "08A",
        LoserDest: "06A"
      },
      "04": {
        "#Round": "Left2",
        HeatNumber: "04",
        WinnerDest: "08B",
        LoserDest: "06B"
      },
      "05": {
        "#Round": "Right3",
        HeatNumber: "05",
        WinnerDest: "07A",
        LoserDest: "502A"
      },
      "06": {
        "#Round": "Right3",
        HeatNumber: "06",
        WinnerDest: "07B",
        LoserDest: "502B"
      },
      "07": {
        "#Round": "Right4",
        HeatNumber: "07",
        WinnerDest: "09A",
        LoserDest: "Place4"
      },
      "08": {
        "#Round": "Left5",
        HeatNumber: "08",
        WinnerDest: "10A",
        LoserDest: "09B"
      },
      "09": {
        "#Round": "Right6",
        HeatNumber: "09",
        WinnerDest: "10B",
        LoserDest: "Place3"
      }
    }
  };
  let scale = 1;
  const gotoTimer = () => {
    console.log("gototimer");
    imgSize();
  };
  function imgSize() {
    var myImg = document.querySelector("#sky");
    var currWidth = myImg.clientWidth;
    var currHeight = myImg.clientHeight;
    console.log(
      "Current width=" + currWidth + ", " + "Original height=" + currHeight
    );
    scale = 0.9 * scale;
    brackets2.imgPositions = brackets2.imgPositions; // force re-render?

    myImg.style.width = brackets2.imgSize.width * scale + "px";
    myImg.style.height = brackets2.imgSize.height * scale + "px";
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

  {#each Object.values(brackets2.imgPositions) as bracket, pos}
    <ChartHotSpot
    pos={Object.keys(brackets2.imgPositions)[pos]}
      {scale}
      left={bracket.left}
      top={bracket.top} />
  {/each}
  <img
    style="position: absolute; z-index: 1; top:0px;left:0px;"
    id="sky"
    src="/archive/charts/double06.png"
    alt="double6"
    on:click={() => gotoTimer()} />

</div>
