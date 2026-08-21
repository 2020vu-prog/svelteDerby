const EntityFactory = require("./shared/EntityFactory.js");
const { EC2Client, RunInstancesCommand } = require("@aws-sdk/client-ec2");
//import { EC2Client, RunInstancesCommand } from "@aws-sdk/client-ec2"; // ES Modules import
// const { EC2Client, RunInstancesCommand } = require("@aws-sdk/client-ec2"); // CommonJS import

const log = require("loglevel");
class DiscordUtils {
    ddbUtils = null;
    constructor(ddbUtils, ec2Client = new EC2Client()) {
        this.ddbUtils = ddbUtils;
        this.ec2 = ec2Client;
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
        let data = await this.ec2.send(new RunInstancesCommand(params));
        log.debug("launchEc2Bot gave:", data);
        return data;
    }
}
module.exports = DiscordUtils;
