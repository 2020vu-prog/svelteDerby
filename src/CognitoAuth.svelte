<script>
    import log from "roarr";

    import Amplify, { Auth } from "aws-amplify";
    import awsconfig from "./config/aws-exports";
    log("config:" + awsconfig);
    Amplify.configure(awsconfig);
</script>

<div>Auth</div>
