<script>
    import { faEllipsisV } from "@fortawesome/free-solid-svg-icons/faEllipsisV";
    import Icon from "fa-svelte";

    // Called with { text } when the icon is clicked.
    export let onMessage = () => {};

    const didClick = () => {
        onMessage({
            text: "Info!",
        });
    };
</script>

<span on:click={didClick} style="display: inline-flex; align-items: center;">
    <Icon icon={faEllipsisV} />
</span>
