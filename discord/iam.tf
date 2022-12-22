




resource "aws_iam_role" "discord_bot_iam_role" {
  name = "${var.DeployEnvironment}_discord_bot_ec2_role"
  path = "/"

  assume_role_policy = <<EOF
{
          "Version" : "2012-10-17",
          "Statement" : [
            {
              "Effect" : "Allow",
              "Principal" : {
                "Service" : ["ec2.amazonaws.com"]
              },
              "Action" : [
                "sts:AssumeRole"
              ]
            }
          ]
        }
EOF

  tags = {
    tag-key = "tag-value"
  }
}
resource "aws_iam_instance_profile" "discord_bot_ec2_profile" {
  name = "${var.DeployEnvironment}_discord_bot_ec2_profile"
  role = aws_iam_role.discord_bot_iam_role.name
}
resource "aws_iam_policy" "discord_bot_iam_policy" {
  name        = "${var.DeployEnvironment}_discord_bot_ec2_policy"
  path        = "/"
  description = "${var.DeployEnvironment}_discord_bot_ec2_policy"

  policy = <<EOFPOLICY
{
  "Version": "2012-10-17",
  "Statement": [
            {
              "Effect" : "Allow",
              "Action" : [
		"ec2:DescribeInstances", 
		"ec2:DescribeImages",
		"ec2:DescribeKeyPairs", 
		"ec2:DescribeSecurityGroups",
		"ec2:DescribeAvailabilityZones",

		"autoscaling:DescribeAutoScalingInstances",
		"autoscaling:SetDesiredCapacity",
		"ssm:GetParameters",
		"sns:Subscribe",
		"sns:Unsubscribe",
		"sns:ListSubscriptionsByTopic",


                "ec2:CreateTags",

                "secretsmanager:*",

                "ecr:BatchCheckLayerAvailability",
                "ecr:BatchGetImage",
                "ecr:DescribeImages",
                "ecr:DescribeImageScanFindings",
                "ecr:GetAuthorizationToken",
                "ecr:GetDownloadUrlForLayer",
                "ecr:GetLifecyclePolicy",
                "ecr:GetLifecyclePolicyPreview",
                "ecr:GetRepositoryPolicy",
                "ecr:ListTagsForResource"
              ],
              "Resource" : "*"
            },
            {
              "Effect" : "Allow",
              "Action" : [
			"s3:PutObject",
			"s3:GetObject",
			"s3:ListBucket"
              ],
		"Resource": [ 
		    "arn:aws:s3:::${var.DerbyDistBucket}",
		    "arn:aws:s3:::${var.DerbyDistBucket}/*",
		    "arn:aws:s3:::${module.boot_bucket.s3_bucket_id}",
		    "arn:aws:s3:::${module.boot_bucket.s3_bucket_id}/*"
		] 
            },
                {
                    "Effect": "Allow",
                    "Action": [
                        "cloudwatch:PutMetricData",
                        "ec2:DescribeVolumes",
                        "ec2:DescribeTags",
                        "logs:PutLogEvents",
                        "logs:DescribeLogStreams",
                        "logs:DescribeLogGroups",
                        "logs:CreateLogStream",
                        "logs:CreateLogGroup"
                    ],
                    "Resource": "*"
                }
  ]
}
EOFPOLICY
}
resource "aws_iam_role_policy_attachment" "discord_bot-ec2-attach" {
  role       = aws_iam_role.discord_bot_iam_role.name
  policy_arn = aws_iam_policy.discord_bot_iam_policy.arn
}
resource "aws_ssm_parameter" "boot_bucket" {
  name  = "discord-bot-boot-bucket"
  type  = "String"
  value = module.boot_bucket.s3_bucket_id
}
resource "aws_ssm_parameter" "boot_bucket2" {
  name  = "/${var.DeployEnvironment}/discord-bot/boot-bucket"
  type  = "String"
  value = module.boot_bucket.s3_bucket_id
}

module "boot_bucket" {
  source = "terraform-aws-modules/s3-bucket/aws"

  bucket_prefix = "rr1-discord-bot-init-bucket"
  acl           = "private"

  versioning = {
    enabled = true
  }

}

output "discord_bot_instance_profile_arn" {
  value = aws_iam_instance_profile.discord_bot_ec2_profile.arn
}
