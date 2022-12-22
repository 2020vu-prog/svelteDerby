provider "aws" {
  region     = "us-east-2"
  
}
variable DeployEnvironment {
	default="dev"
}
variable DerbyDistBucket {
}
variable DiscordBotToken {
}

locals{
  tags = {
    Environment = var.DeployEnvironment
    CreatedBy = "terraform ${basename(path.cwd)}"
  }
  launch-template-name = "discord-bot-asg"
}
data "aws_ami" "latest_ami2" {
  most_recent = true
  owners      = ["amazon"] # AWS

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-2.0.*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}
resource "aws_security_group" "allow_egress_from_discordBot" {
  name        = "${var.DeployEnvironment}_egress"
  description = "Allow egress discordBot"

  egress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = merge(local.tags, {
    Name  = "${var.DeployEnvironment}_egress"
    dome9 = "exclude"
  })

}

resource "aws_security_group" "allow_ssh" {
  name        = "allow_ssh_discordbot"
  description = "Allow ssh inbound traffic (22)"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks     = ["0.0.0.0/0"] 
  }

  tags = merge(local.tags,{
    Name=  "allow ssh discordbot"
  })

}

resource "aws_security_group" "allow_sns" {
  name        = "allow_sns_discordbot"
  description = "Allow sns inbound traffic (8090)"

  ingress {
    from_port   = 8090
    to_port     = 8090
    protocol    = "tcp"
    cidr_blocks     = ["0.0.0.0/0"] 
  }

  tags = merge(local.tags,{
    Name=  "allow sns discordbot"
  })

}
resource "aws_security_group" "allow_discord_udp" {
  name        = "allow_udp_discordbot"
  description = "Allow udp traffic"

  ingress {
    from_port   = 50000
    to_port     = 65535
    protocol    = "udp"
    cidr_blocks     = ["0.0.0.0/0"] 
  }
  egress {
    from_port   = 50000
    to_port     = 65535
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.tags,{
    Name=  "allow udp discordbot"
  })

}


// published here, consumed by lambda to manage bot launches
resource "aws_ssm_parameter" "bot_launch_template" {
  name  = "/${var.DeployEnvironment}/discord-bot/launch-template-name"
  type  = "String"
  value = local.launch-template-name
}
resource "aws_ssm_parameter" "discord_bot_token" {
  //name  = "/${var.DeployEnvironment}/discord-bot/launch-template-name"
  name  = "discord-bot-token"
  type  = "String"
  value = var.DiscordBotToken
}

module "asg" {

  source  = "terraform-aws-modules/autoscaling/aws"
  version = "~> 6.7.0"

  # Autoscaling group
  name = "discord-bot-asg"

  min_size                  = 0
  max_size                  = 1
  desired_capacity          = 0
  wait_for_capacity_timeout = 0
  health_check_type         = "EC2"

  initial_lifecycle_hooks = [
    {
      name                  = "ExampleStartupLifeCycleHook"
      default_result        = "CONTINUE"
      heartbeat_timeout     = 60
      lifecycle_transition  = "autoscaling:EC2_INSTANCE_LAUNCHING"
      notification_metadata = jsonencode({ "hello" = "world" })
    },
    {
      name                  = "ExampleTerminationLifeCycleHook"
      default_result        = "CONTINUE"
      heartbeat_timeout     = 180
      lifecycle_transition  = "autoscaling:EC2_INSTANCE_TERMINATING"
      notification_metadata = jsonencode({ "goodbye" = "world" })
    }
  ]

  instance_refresh = {
    strategy = "Rolling"
    preferences = {
      min_healthy_percentage = 50
    }
    triggers = ["tag"]
  }

  # Launch template
  launch_template_name= local.launch-template-name
  launch_template_description= "Discord bot LT"
  update_default_version = true


  image_id          = data.aws_ami.latest_ami2.id
  instance_type     = "t3.nano"
  ebs_optimized     = true

  placement = {
  availability_zone       = "us-east-2b"
  }

  tag_specifications = [
    {
      resource_type = "instance"
      tags          = { WhatAmI = "Instance" }
    },
    {
      resource_type = "volume"
      tags          = { WhatAmI = "Volume" , Name="discordBot"}
    }
  ]

  tags = {
    Environment = "dev"
    Usage= "discordBot2"
  }

  security_groups=[
        aws_security_group.allow_sns.id,
        aws_security_group.allow_ssh.id,
	aws_security_group.allow_egress_from_discordBot.id,
        aws_security_group.allow_discord_udp.id,
  ]
  block_device_mappings = [
    {
      # Root volume
      device_name = "/dev/xvda"
      no_device   = 0
      ebs = {
        delete_on_termination = true
        encrypted             = true
        volume_size           = 8
        volume_type           = "gp3"
      }
    }
]

  //user_data = file("tfScripts/on_boot.sh")
  user_data= base64encode(file("tfScripts/on_boot.sh"))
  key_name="discordKey"
  instance_initiated_shutdown_behavior="terminate"
  iam_instance_profile_arn=aws_iam_instance_profile.discord_bot_ec2_profile.arn
  default_cooldown=0
}
output "launch-template"{
	value=local.launch-template-name
}
