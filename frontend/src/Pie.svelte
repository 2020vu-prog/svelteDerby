<script>
    import { theme } from "./stores.js";
    export let size = 200;
    export let percent = 0;
    export let bgColor = "lightgrey";
    export let fgColor = $theme;

    $: viewBox = `0 0 ${size} ${size}`;

    $: radius = size / 2;
    $: halfCircumference = Math.PI * radius;
    $: pieSize = halfCircumference * (percent / 100);
    $: dashArray = `0 ${halfCircumference - pieSize} ${pieSize}`;
</script>

<svg width={size} height={size} viewBox={viewBox}>
    <circle r={radius} cx={radius} cy={radius} fill={bgColor} />
    <circle
        r={radius / 2}
        cx={radius}
        cy={radius}
        fill={bgColor}
        stroke={fgColor}
        stroke-width={radius}
        stroke-dasharray={dashArray}
    />
    <text
        x="50%"
        y="50%"
        dominant-baseline="middle"
        text-anchor="middle"
        style="font-size: {radius / 3}px; fill: white"
    >
        {Math.round(percent)}%
    </text>
</svg>
