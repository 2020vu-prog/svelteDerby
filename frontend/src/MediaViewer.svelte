
<script>
	    import log from "loglevel";
	import {
        videoHref,
		developerMode,
    } from "./stores.js";
	import Icon from "fa-svelte";
    import { faBackward } from "@fortawesome/free-solid-svg-icons/faBackward";
    import { faForward } from "@fortawesome/free-solid-svg-icons/faForward";
	import { sleep,
		extractS3VideoMeta,
		hhmmssFmt, 
         mmddyyFmt,
	
	} from './utils.js'
	import { tick } from 'svelte';
	import { onMount } from "svelte";
//https://svelte.dev/examples/media-elements
	// These values are bound to properties of the video
	let time = 0;
	let startFormatted=0
	let tgtTimeSeconds=0
	let duration;
	let paused = true;
	let video

	let showControls = true;
	let showControlsTimeout;

	// Used to track time of last mouse down event
	let lastMouseDown;
	onMount(async () => {
        log.warn("mounting media");
		setTgtTimeSeconds()
		seekToFinish()
    });

	function setTgtTimeSeconds(){
		const meta=extractS3VideoMeta($videoHref)
		tgtTimeSeconds=0

		if(meta && meta.tgtTimeMs){
			startFormatted=
				mmddyyFmt(meta.tgtTimeMs) +
				" " +
				hhmmssFmt(meta.tgtTimeMs)
			log.debug(`tti2: ${startFormatted}`)
		}
		if(meta && meta.snipStart && meta.tgtTimeMs){
			const tt= (meta.tgtTimeMs -meta.snipStart)/1000
			log.debug(`tt: ${tt}`)
			time=tt
			tgtTimeSeconds=tt

		}
	}
	function makeControlsVisible(){
		// Make the controls visible, but fade out after
		// 2.5 seconds of inactivity
		clearTimeout(showControlsTimeout);
		showControlsTimeout = setTimeout(() => (showControls = false), 2500);
		showControls = true;
		
	}
	function handleMove(e) {
        console.log("MM")

		makeControlsVisible()
		if (!isNumber(duration)) return; // video not loaded yet
		if (!duration) return; // video not loaded yet
		if (e.type !== 'touchmove' && !(e.buttons & 1)) return; // mouse not down

		const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
		const { left, right } = this.getBoundingClientRect();
		time = (duration * (clientX - left)) / (right - left);
	}

	// we can't rely on the built-in click event, because it fires
	// after a drag — we have to listen for clicks ourselves
	function handleMousedown(e) {
		lastMouseDown = new Date();
        console.log("MD")
	}

	function handleMouseup(e) {
        console.log("MU")
		if (new Date() - lastMouseDown < 300) {
        console.log("MUC")
			if (paused){
        console.log("MUC play")

            e.target.play();
            } else{

        console.log("MUC paus")
			e.target.pause();
            }
		}
	}

	function format(seconds) {
		if (!isNumber(seconds)) return '...';

		const minutes = Math.floor(seconds / 60);
		seconds = Math.floor(seconds % 60);
		if (seconds < 10) seconds = '0' + seconds;

		return `${minutes}:${seconds}`;
	}


	let animateDir=0
    let animateRequest=0
    function slowV(direction){
        animateDir=direction
        animateRequest=Date.now()
        animateLoop(animateRequest)
        //log.debug("slowV",direction)
    }
    async function animateLoop(arParam){
        //log.debug("animateLoop ad",animateDir)

        while(animateDir!=0 && arParam===animateRequest){
            await sleep(200)
            stepMedia(animateDir)
        }
    }
    function stepMedia(direction){
        const step=.02
        time=time+ (step *direction)
		makeControlsVisible()
    }
	function isNumber(x){
		return !isNaN(x)   && isFinite(x)
	}
	function getProgress(time,duration){
		if (isNumber(time)&& isNumber(duration) && duration){
			return time / duration 
		}
		else{
			return 0
		}
	}
	async function seekToFinish(){
		video.pause();
		time=0
		await tick()
		time=tgtTimeSeconds;
		makeControlsVisible()
		
	}
</script>

  <!--
<h1>XYZ Video</h1>

		src="https://sveltejs.github.io/assets/caminandes-llamigos.mp4"
  -->

  {#if startFormatted}
	<h6>
		{startFormatted}
	</h6>
  {/if}
<div>
	<video
		src={$videoHref}
		on:mousemove={handleMove}
		on:touchmove|preventDefault={handleMove}
		on:mousedown={handleMousedown}
		on:mouseup={handleMouseup}
		bind:currentTime={time}
		bind:duration
		bind:paused
		bind:this={video}
	>
		<track kind="captions" />
	</video>

	<div class="controls" style="opacity: {duration && showControls ? 1 : 0}">
		<progress value={getProgress(time , duration )} />

		<div class="info">
			<span class="time overlay">{format(time)}</span>
			<span class="overlay">click anywhere to {paused ? 'play' : 'pause'} / drag to seek</span>
			<span class="time overlay">{format(duration)}</span>
		</div>
	</div>
</div>
            <span
                            on:click={() => stepMedia(-1)}
                            on:mousedown={()=>slowV(-1)}
                            on:touchstart={()=>slowV(-1)}
                            on:mouseup={()=>slowV(0)}
                            on:touchend={()=>slowV(0)}
            >
            <p></p>
                            <Icon
                            class="xLargeIcon"
                            icon={ faBackward}
                        />
        </span>
        &nbsp;
        &nbsp;
		{#if tgtTimeSeconds}
		<img alt="flag" 
			on:click={seekToFinish}
			src="data/checkered-flag-svgrepo-com.svg" 
			width="25px" />
		{/if}
        &nbsp;
        &nbsp;
        &nbsp;
            <span
                            on:click={() => stepMedia(+1)}
                            on:mousedown={()=>slowV(+1)}
                            on:touchstart={()=>slowV(+1)}
                            on:mouseup={()=>slowV(0)}
                            on:touchend={()=>slowV(0)}
            >
                            <Icon
                            class="xLargeIcon"
                            icon={ faForward}
                        />
            <p></p>
        </span>
		{#if $developerMode}
		<br/>
		  Offset: {tgtTimeSeconds}
		{/if}
<style>
	div {
		position: relative;
	}

	.controls {
		position: absolute;
		top: 0;
		width: 100%;
		transition: opacity 1s;
	}

	.info {
		display: flex;
		width: 100%;
		justify-content: space-between;
	}

	span.overlay {
		padding: 0.2em 0.5em;
		color: white;
		text-shadow: 0 0 8px black;
		font-size: 1.4em;
		opacity: 0.7;
	}

	.time {
		width: 3em;
	}

	.time:last-child {
		text-align: right;
	}

	progress {
		display: block;
		width: 100%;
		height: 10px;
		-webkit-appearance: none;
		appearance: none;
	}

	progress::-webkit-progress-bar {
		background-color: rgba(0, 0, 0, 0.2);
	}

	progress::-webkit-progress-value {
		background-color: rgba(255, 255, 255, 0.6);
	}

	video {
		width: 100%;
	}
</style>
