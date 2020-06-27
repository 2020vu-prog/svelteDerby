### from: https://docs.amplify.aws/cli/teams/overview#setting-up-prod-and-dev-environments


Chriss-MacBook-Air:svelteDerby cwitte$ amplify env add
>> OUTPUT:

Note: It is recommended to run this command from the root of your app directory
? Do you want to use an existing environment? No
? Enter a name for the environment sandboxa
Using default provider  awscloudformation

For more information on AWS Profiles, see:
https://docs.aws.amazon.com/cli/latest/userguide/cli-multiple-profiles.html

? Do you want to use an AWS profile? No
? accessKeyId:  AKIAZYO4X5**********
? secretAccessKey:  g/hVUelF4wt9BDHvhZzG********************
? region:  us-west-2
Adding backend environment sandboxa to AWS Amplify Console app: d3tjh0mxu6kxc9
⠴ Initializing project in the cloud...

CREATE_IN_PROGRESS AuthRole                            AWS::IAM::Role             Sun Jun 21 2020 14:41:45 GMT-0500 (Central Daylight Time) Resource creation Initiated
CREATE_IN_PROGRESS UnauthRole                          AWS::IAM::Role             Sun Jun 21 2020 14:41:45 GMT-0500 (Central Daylight Time) Resource creation Initiated
CREATE_IN_PROGRESS AuthRole                            AWS::IAM::Role             Sun Jun 21 2020 14:41:45 GMT-0500 (Central Daylight Time)
CREATE_IN_PROGRESS DeploymentBucket                    AWS::S3::Bucket            Sun Jun 21 2020 14:41:44 GMT-0500 (Central Daylight Time)
CREATE_IN_PROGRESS UnauthRole                          AWS::IAM::Role             Sun Jun 21 2020 14:41:44 GMT-0500 (Central Daylight Time)
CREATE_IN_PROGRESS amplify-sveltederby-sandboxa-144138 AWS::CloudFormation::Stack Sun Jun 21 2020 14:41:40 GMT-0500 (Central Daylight Time) User Initiated
⠋ Initializing project in the cloud...

CREATE_IN_PROGRESS DeploymentBucket AWS::S3::Bucket Sun Jun 21 2020 14:41:46 GMT-0500 (Central Daylight Time) Resource creation Initiated
⠴ Initializing project in the cloud...

CREATE_COMPLETE AuthRole   AWS::IAM::Role Sun Jun 21 2020 14:42:00 GMT-0500 (Central Daylight Time)
CREATE_COMPLETE UnauthRole AWS::IAM::Role Sun Jun 21 2020 14:42:00 GMT-0500 (Central Daylight Time)
⠴ Initializing project in the cloud...

CREATE_COMPLETE amplify-sveltederby-sandboxa-144138 AWS::CloudFormation::Stack Sun Jun 21 2020 14:42:09 GMT-0500 (Central Daylight Time)
CREATE_COMPLETE DeploymentBucket                    AWS::S3::Bucket            Sun Jun 21 2020 14:42:07 GMT-0500 (Central Daylight Time)
✔ Successfully created initial AWS cloud resources for deployments.
✔ Initialized provider successfully.
Initialized your environment successfully.

Your project has been successfully initialized and connected to the cloud!

Some next steps:
"amplify status" will show you what you've added already and if it's locally configured or deployed
"amplify add <category>" will allow you to add features like user login or a backend API
"amplify push" will build all your local backend resources and provision it in the cloud
“amplify console” to open the Amplify Console and view your project status
"amplify publish" will build all your local backend and frontend resources (if you have hosting category added) and provision it in the cloud

Pro tip:
Try "amplify add api" to create a backend API and then "amplify publish" to deploy everything
