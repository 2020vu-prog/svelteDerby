<script>
    import { raceConfig, statusMessage } from "./stores.js";
    import { faInfo } from "@fortawesome/free-solid-svg-icons/faInfo";
    import Icon from "fa-svelte";
    import { Auth } from "aws-amplify";
    import axios from "axios";

    export let dbName;
    export let dbKey;
    const doDelete = () => {
        handleDelete();
    };
    async function handleDelete() {
        console.log(`deleting: ${dbName} ${dbKey}`);
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            SK: dbKey,
        };

        axios.defaults.headers.common["Authorization"] = bearer;

        const endpoint =
            dbName === "RacePhase" ? "/deleteRacePhase" : "/deleteRaceStanding";

        try {
            const response = await axios.post(
                $raceConfig.baseUrl + endpoint,
                req
            );
            if (response.data.status === "error") {
                $statusMessage = {
                    text: response.data.error,
                    type: response.data.status,
                };
            } else {
                $statusMessage = {
                    text: `[${dbName}] Deleted.`,
                    type: "success",
                };
            }
        } catch (e) {
            $statusMessage = {
                text: response.data.error,
                type: "error",
            };
        }
    }
</script>

<span on:click={doDelete}>
    <!-- TODO: don't show info button if no delete permission -->
    <Icon icon={faInfo} />
</span>
