<script>
    import { faEllipsisV } from "@fortawesome/free-solid-svg-icons/faEllipsisV";
    import Icon from "fa-svelte";

    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();

    const didClick = () => {
        dispatch("message", {
            text: "Info!",
        });
    };
</script>

<span on:click={didClick}>
    <!-- TODO: don't show info button if no delete permission -->
    <Icon icon={faEllipsisV} />
</span>
