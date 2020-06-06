<script>
    import { raceConfig, statusMessage } from "./stores.js";
    import { faInfo } from "@fortawesome/free-solid-svg-icons/faInfo";
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
    <Icon icon={faInfo} />
</span>
