const EntityFactory = require("./shared/EntityFactory.js");
//import { EC2Client, RunInstancesCommand } from "@aws-sdk/client-ec2"; // ES Modules import
// const { EC2Client, RunInstancesCommand } = require("@aws-sdk/client-ec2"); // CommonJS import

const log = require("loglevel");
class DiscordUtils {
    AWS = null;
    ddbUtils = null;
    constructor(AWS, ddbUtils) {
        this.AWS = AWS;
        this.ddbUtils = ddbUtils;
    }
    // TODO: iam permissions on runInstance not working
    // TODO: multiple org strategy (currently thinking one bot/org)
    // TODO: don't unsubscribe other orgs if we use multiple bot strategy
    // TODO: configure guild/server?
    // TODO: list running ec2, and don't start multiple bots foe a given org

    async launchEc2Bot(orgId) {
        log.debug("launchEc2Bot begin:");
        //const client = new EC2Client();
        //const command = new RunInstancesCommand(input);
        //const response = await client.send(command);
        //log.debug("launchEc2Bot gave:", response);

        let params = {
            MaxCount: 1,
            MinCount: 1,
            LaunchTemplate: {
                LaunchTemplateName: "discord-bot-asg",
            },
            TagSpecifications: [
                {
                    ResourceType: "instance",
                    Tags: [
                        { Key: "Name", Value: `Discord bot ${orgId}` },
                        { Key: "OrgId", Value: `${orgId}` },
                    ],
                },
            ],
        };
        let data = await new this.AWS.EC2().runInstances(params).promise();
        log.debug("launchEc2Bot gave:", data);
        return data;
    }
}
module.exports = DiscordUtils;
