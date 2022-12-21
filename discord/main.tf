provider "aws" {
  region     = "us-east-2"
  
  profile ="svelteDerby"
  
}
variable DeployEnvironment {
	default="dev"
}
locals{
  tags = {
    Environment = var.DeployEnvironment
    CreatedBy = "terraform ${basename(path.cwd)}"
  }
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


module "asg" {

  source  = "terraform-aws-modules/autoscaling/aws"
  version = "~> 4.4.0"

  # Autoscaling group
  name = "discord-bot-asg"

  min_size                  = 0
  max_size                  = 1
  desired_capacity          = 1
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
  lt_name                = "discord-bot-asg"
  description            = "Discord bot LT"
  update_default_version = true

  use_lt    = true
  create_lt = true

  image_id          = data.aws_ami.latest_ami2.id
  instance_type     = "t3.nano"
  ebs_optimized     = true

  availability_zone       = ["us-east-2b","us-east-2a"]

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

  tags = [
    {
      key                 = "Environment"
      value               = "dev"
      propagate_at_launch = true
    },
    {
      key                 = "Usage"
      value               = "discordBot"
      propagate_at_launch = true
    },
  ]
  security_groups=[
        aws_security_group.allow_sns.id,
        aws_security_group.allow_ssh.id,
	aws_security_group.allow_egress_from_discordBot.id,
        aws_security_group.allow_discord_udp.id,
  ]

  //user_data = file("tfScripts/on_boot.sh")
  user_data_base64 = base64encode(file("tfScripts/on_boot.sh"))
  key_name="discordKey"
  instance_initiated_shutdown_behavior="terminate"
  iam_instance_profile_arn=aws_iam_instance_profile.discord_bot_ec2_profile.arn
  default_cooldown=0
}
