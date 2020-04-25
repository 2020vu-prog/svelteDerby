<script>

    import Amplify, { Auth } from 'aws-amplify';
    import awsconfig from './config/aws-exports';
    console.log("config:" + awsconfig);
    Amplify.configure(awsconfig);

</script>
<div>
    Auth
</div>