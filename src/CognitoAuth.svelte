<script>
    import log from "loglevel";

    import Amplify, { Auth } from "aws-amplify";
    import awsconfig from "./config/aws-exports";
    log.debug("config:" + awsconfig);
    Amplify.configure(awsconfig);
</script>

<div>Auth</div>
