data "aws_iam_policy_document" "deploy_storage" {
  statement {
    sid       = "ReadAccountMetadata"
    effect    = "Allow"
    actions   = ["sts:GetCallerIdentity"]
    resources = ["*"]
  }

  statement {
    sid    = "TerraformStateBucket"
    effect = "Allow"
    actions = [
      "s3:GetBucketLocation",
      "s3:ListBucket",
    ]
    resources = local.s3_bucket_arns
  }

  statement {
    sid    = "TerraformStateAndFrontendArtifacts"
    effect = "Allow"
    actions = [
      "s3:AbortMultipartUpload",
      "s3:DeleteObject",
      "s3:DeleteObjectTagging",
      "s3:GetObject",
      "s3:GetObjectTagging",
      "s3:ListMultipartUploadParts",
      "s3:PutObject",
      "s3:PutObjectAcl",
      "s3:PutObjectTagging",
    ]
    resources = local.s3_object_arns
  }

  statement {
    sid    = "ManageAppBuckets"
    effect = "Allow"
    actions = [
      "s3:CreateBucket",
      "s3:DeleteBucket",
      "s3:DeleteBucketCors",
      "s3:DeleteBucketPolicy",
      "s3:DeleteReplicationConfiguration",
      "s3:DeleteBucketWebsite",
      "s3:GetAccelerateConfiguration",
      "s3:GetBucketAcl",
      "s3:GetBucketCors",
      "s3:GetBucketLogging",
      "s3:GetLifecycleConfiguration",
      "s3:GetBucketNotification",
      "s3:GetBucketObjectLockConfiguration",
      "s3:GetBucketOwnershipControls",
      "s3:GetBucketPolicy",
      "s3:GetBucketPublicAccessBlock",
      "s3:GetBucketRequestPayment",
      "s3:GetBucketTagging",
      "s3:GetBucketVersioning",
      "s3:GetBucketWebsite",
      "s3:GetEncryptionConfiguration",
      "s3:GetReplicationConfiguration",
      "s3:ListBucket",
      "s3:PutBucketAcl",
      "s3:PutBucketCors",
      "s3:PutBucketObjectLockConfiguration",
      "s3:PutBucketRequestPayment",
      "s3:PutBucketLogging",
      "s3:PutLifecycleConfiguration",
      "s3:PutBucketNotification",
      "s3:PutBucketOwnershipControls",
      "s3:PutBucketPolicy",
      "s3:PutBucketPublicAccessBlock",
      "s3:PutBucketTagging",
      "s3:PutBucketVersioning",
      "s3:PutBucketWebsite",
      "s3:PutEncryptionConfiguration",
      "s3:PutReplicationConfiguration",
      "s3:PutAccelerateConfiguration",
    ]
    resources = local.app_bucket_arns
  }

  statement {
    sid    = "ManageExternalMediaBucketNotification"
    effect = "Allow"
    actions = [
      "s3:GetBucketNotification",
      "s3:PutBucketNotification",
    ]
    resources = local.external_notification_bucket_arns
  }

  statement {
    sid       = "ListBucketsForTerraform"
    effect    = "Allow"
    actions   = ["s3:ListAllMyBuckets"]
    resources = ["*"]
  }

  dynamic "statement" {
    for_each = local.terraform_lock_table_arns

    content {
      sid    = "TerraformLockTable"
      effect = "Allow"
      actions = [
        "dynamodb:DeleteItem",
        "dynamodb:DescribeTable",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
      ]
      resources = [statement.value]
    }
  }

  statement {
    sid    = "ManageAppDynamoTables"
    effect = "Allow"
    actions = [
      "dynamodb:CreateTable",
      "dynamodb:DeleteTable",
      "dynamodb:DescribeContinuousBackups",
      "dynamodb:DescribeTable",
      "dynamodb:DescribeTimeToLive",
      "dynamodb:ListTagsOfResource",
      "dynamodb:PutItem",
      "dynamodb:TagResource",
      "dynamodb:UntagResource",
      "dynamodb:UpdateContinuousBackups",
      "dynamodb:UpdateTable",
      "dynamodb:UpdateTimeToLive",
    ]
    resources = concat([
      "arn:${local.partition}:dynamodb:${var.AwsRegion}:${local.account_id}:table/DerbyMain",
      "arn:${local.partition}:dynamodb:${var.AwsRegion}:${local.account_id}:table/DerbyDist",
      "arn:${local.partition}:dynamodb:${var.AwsRegion}:${local.account_id}:table/DerbyTimer",
      "arn:${local.partition}:dynamodb:${var.AwsRegion}:${local.account_id}:table/ElapsedTemp",
      "arn:${local.partition}:dynamodb:${var.AwsRegion}:${local.account_id}:table/timer-protobuf",
    ], local.terraform_lock_table_arns)
  }

  statement {
    sid       = "ListDynamoTables"
    effect    = "Allow"
    actions   = ["dynamodb:ListTables"]
    resources = ["*"]
  }
}

data "aws_iam_policy_document" "deploy_compute" {
  statement {
    sid    = "ManageAppLambdas"
    effect = "Allow"
    actions = [
      "lambda:AddPermission",
      "lambda:CreateEventSourceMapping",
      "lambda:CreateFunction",
      "lambda:CreateFunctionUrlConfig",
      "lambda:DeleteEventSourceMapping",
      "lambda:DeleteFunction",
      "lambda:DeleteFunctionUrlConfig",
      "lambda:DeletePermission",
      "lambda:GetEventSourceMapping",
      "lambda:GetFunction",
      "lambda:GetFunctionCodeSigningConfig",
      "lambda:GetFunctionConcurrency",
      "lambda:GetFunctionConfiguration",
      "lambda:GetFunctionUrlConfig",
      "lambda:GetPolicy",
      "lambda:GetRuntimeManagementConfig",
      "lambda:ListTags",
      "lambda:ListVersionsByFunction",
      "lambda:PublishVersion",
      "lambda:RemovePermission",
      "lambda:TagResource",
      "lambda:UntagResource",
      "lambda:UpdateEventSourceMapping",
      "lambda:UpdateFunctionCode",
      "lambda:UpdateFunctionConfiguration",
      "lambda:UpdateFunctionUrlConfig",
    ]
    resources = [
      "arn:${local.partition}:lambda:${var.AwsRegion}:${local.account_id}:function:derbyMain",
      "arn:${local.partition}:lambda:${var.AwsRegion}:${local.account_id}:function:dynamoMain",
      "arn:${local.partition}:lambda:${var.AwsRegion}:${local.account_id}:function:sqsCcaMain",
      "arn:${local.partition}:lambda:${var.AwsRegion}:${local.account_id}:event-source-mapping:*",
    ]
  }

  statement {
    sid    = "ManageLambdaLogGroups"
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:DeleteLogGroup",
      "logs:DeleteRetentionPolicy",
      "logs:ListTagsLogGroup",
      "logs:PutRetentionPolicy",
      "logs:TagLogGroup",
      "logs:UntagLogGroup",
    ]
    resources = [
      "arn:${local.partition}:logs:${var.AwsRegion}:${local.account_id}:log-group:/aws/lambda/derbyMain*",
      "arn:${local.partition}:logs:${var.AwsRegion}:${local.account_id}:log-group:/aws/lambda/dynamoMain*",
      "arn:${local.partition}:logs:${var.AwsRegion}:${local.account_id}:log-group:/aws/lambda/sqsCcaMain*",
    ]
  }

  statement {
    sid       = "FindLambdaLogGroups"
    effect    = "Allow"
    actions   = ["logs:DescribeLogGroups"]
    resources = ["*"]
  }
}

data "aws_iam_policy_document" "deploy_iam" {
  statement {
    sid    = "ManageLambdaIam"
    effect = "Allow"
    actions = [
      "iam:CreatePolicy",
      "iam:CreatePolicyVersion",
      "iam:DeletePolicy",
      "iam:DeletePolicyVersion",
      "iam:DeleteRole",
      "iam:DeleteRolePermissionsBoundary",
      "iam:DeleteRolePolicy",
      "iam:DetachRolePolicy",
      "iam:GetPolicy",
      "iam:GetPolicyVersion",
      "iam:GetRole",
      "iam:GetRolePolicy",
      "iam:ListAttachedRolePolicies",
      "iam:ListInstanceProfilesForRole",
      "iam:ListPolicyVersions",
      "iam:ListPolicyTags",
      "iam:ListRolePolicies",
      "iam:ListRoleTags",
      "iam:PutRolePolicy",
      "iam:SetDefaultPolicyVersion",
      "iam:TagPolicy",
      "iam:TagRole",
      "iam:UntagPolicy",
      "iam:UntagRole",
      "iam:UpdateAssumeRolePolicy",
      "iam:UpdateRole",
    ]
    resources = [
      "arn:${local.partition}:iam::${local.account_id}:role/iam_for_lambda_*",
      "arn:${local.partition}:iam::${local.account_id}:role/iam_for_lambda_dynamo_*",
      "arn:${local.partition}:iam::${local.account_id}:role/iam_for_lambda_cca_*",
      "arn:${local.partition}:iam::${local.account_id}:role/cognito_authenticated_*",
      "arn:${local.partition}:iam::${local.account_id}:policy/cloudwatch_allow_*",
      "arn:${local.partition}:iam::${local.account_id}:policy/dynamo_allow_*",
      "arn:${local.partition}:iam::${local.account_id}:policy/ccaMain_allow_*",
    ]
  }

  statement {
    sid     = "CreateManagedRolesWithBoundary"
    effect  = "Allow"
    actions = ["iam:CreateRole"]
    resources = [
      "arn:${local.partition}:iam::${local.account_id}:role/iam_for_lambda_*",
      "arn:${local.partition}:iam::${local.account_id}:role/iam_for_lambda_dynamo_*",
      "arn:${local.partition}:iam::${local.account_id}:role/iam_for_lambda_cca_*",
      "arn:${local.partition}:iam::${local.account_id}:role/cognito_authenticated_*",
    ]

    condition {
      test     = "StringEquals"
      variable = "iam:PermissionsBoundary"
      values   = [local.managed_role_permissions_boundary_arn]
    }
  }

  statement {
    sid     = "ApplyManagedRoleBoundary"
    effect  = "Allow"
    actions = ["iam:PutRolePermissionsBoundary"]
    resources = [
      "arn:${local.partition}:iam::${local.account_id}:role/iam_for_lambda_*",
      "arn:${local.partition}:iam::${local.account_id}:role/iam_for_lambda_dynamo_*",
      "arn:${local.partition}:iam::${local.account_id}:role/iam_for_lambda_cca_*",
      "arn:${local.partition}:iam::${local.account_id}:role/cognito_authenticated_*",
    ]

    condition {
      test     = "StringEquals"
      variable = "iam:PermissionsBoundary"
      values   = [local.managed_role_permissions_boundary_arn]
    }
  }

  statement {
    sid     = "AttachOnlyApplicationPolicies"
    effect  = "Allow"
    actions = ["iam:AttachRolePolicy"]
    resources = [
      "arn:${local.partition}:iam::${local.account_id}:role/iam_for_lambda_*",
      "arn:${local.partition}:iam::${local.account_id}:role/iam_for_lambda_dynamo_*",
      "arn:${local.partition}:iam::${local.account_id}:role/iam_for_lambda_cca_*",
    ]

    condition {
      test     = "ArnLike"
      variable = "iam:PolicyARN"
      values = [
        "arn:${local.partition}:iam::${local.account_id}:policy/cloudwatch_allow_*",
        "arn:${local.partition}:iam::${local.account_id}:policy/dynamo_allow_*",
        "arn:${local.partition}:iam::${local.account_id}:policy/ccaMain_allow_*",
      ]
    }
  }

  statement {
    sid     = "PassRolesOnlyToTheirServices"
    effect  = "Allow"
    actions = ["iam:PassRole"]
    resources = [
      "arn:${local.partition}:iam::${local.account_id}:role/iam_for_lambda_*",
      "arn:${local.partition}:iam::${local.account_id}:role/iam_for_lambda_dynamo_*",
      "arn:${local.partition}:iam::${local.account_id}:role/iam_for_lambda_cca_*",
    ]

    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["lambda.amazonaws.com"]
    }
  }

  statement {
    sid    = "ReadLegacyAndroidUserState"
    effect = "Allow"
    actions = [
      "iam:GetAccessKeyLastUsed",
      "iam:GetUser",
      "iam:GetUserPolicy",
      "iam:ListAccessKeys",
      "iam:ListUserTags",
    ]
    resources = ["arn:${local.partition}:iam::${local.account_id}:user/system/android-MqGrafika-Baked-In-User"]
  }
}

data "aws_iam_policy_document" "deploy_identity_edge" {
  statement {
    sid    = "ManageCloudfront"
    effect = "Allow"
    actions = [
      "cloudfront:CreateCloudFrontOriginAccessIdentity",
      "cloudfront:CreateDistribution",
      "cloudfront:DeleteCloudFrontOriginAccessIdentity",
      "cloudfront:DeleteDistribution",
      "cloudfront:GetCloudFrontOriginAccessIdentity",
      "cloudfront:GetCloudFrontOriginAccessIdentityConfig",
      "cloudfront:GetDistribution",
      "cloudfront:GetDistributionConfig",
      "cloudfront:ListTagsForResource",
      "cloudfront:TagResource",
      "cloudfront:UntagResource",
      "cloudfront:UpdateCloudFrontOriginAccessIdentity",
      "cloudfront:UpdateDistribution",
    ]
    resources = ["*"]
  }

  statement {
    sid    = "ManageCognito"
    effect = "Allow"
    actions = [
      "cognito-identity:CreateIdentityPool",
      "cognito-identity:DeleteIdentityPool",
      "cognito-identity:DescribeIdentityPool",
      "cognito-identity:GetIdentityPoolRoles",
      "cognito-identity:SetIdentityPoolRoles",
      "cognito-identity:TagResource",
      "cognito-identity:UntagResource",
      "cognito-identity:UpdateIdentityPool",
      "cognito-idp:CreateIdentityProvider",
      "cognito-idp:CreateUserPool",
      "cognito-idp:CreateUserPoolClient",
      "cognito-idp:CreateUserPoolDomain",
      "cognito-idp:DeleteIdentityProvider",
      "cognito-idp:DeleteUserPool",
      "cognito-idp:DeleteUserPoolClient",
      "cognito-idp:DeleteUserPoolDomain",
      "cognito-idp:DescribeIdentityProvider",
      "cognito-idp:DescribeUserPool",
      "cognito-idp:DescribeUserPoolClient",
      "cognito-idp:DescribeUserPoolDomain",
      "cognito-idp:GetUserPoolMfaConfig",
      "cognito-idp:ListTagsForResource",
      "cognito-idp:ListIdentityProviders",
      "cognito-idp:ListUserPoolClients",
      "cognito-idp:SetUserPoolMfaConfig",
      "cognito-idp:TagResource",
      "cognito-idp:UntagResource",
      "cognito-idp:UpdateIdentityProvider",
      "cognito-idp:UpdateUserPool",
      "cognito-idp:UpdateUserPoolClient",
    ]
    resources = ["*"]
  }
}

data "aws_iam_policy_document" "deploy_integration" {
  statement {
    sid    = "ManageMessaging"
    effect = "Allow"
    actions = [
      "sns:CreateTopic",
      "sns:DeleteTopic",
      "sns:GetSubscriptionAttributes",
      "sns:GetTopicAttributes",
      "sns:ListSubscriptionsByTopic",
      "sns:ListTagsForResource",
      "sns:SetTopicAttributes",
      "sns:Subscribe",
      "sns:TagResource",
      "sns:Unsubscribe",
      "sqs:CreateQueue",
      "sqs:DeleteQueue",
      "sqs:GetQueueAttributes",
      "sqs:GetQueueUrl",
      "sqs:ListQueueTags",
      "sqs:SetQueueAttributes",
      "sqs:TagQueue",
      "sqs:UntagQueue",
    ]
    resources = ["*"]
  }

  statement {
    sid    = "ManageEvents"
    effect = "Allow"
    actions = [
      "events:DeleteRule",
      "events:DescribeRule",
      "events:ListTagsForResource",
      "events:ListTargetsByRule",
      "events:PutRule",
      "events:PutTargets",
      "events:RemoveTargets",
      "events:TagResource",
      "events:UntagResource",
    ]
    resources = ["arn:${local.partition}:events:${var.AwsRegion}:${local.account_id}:rule/derbyMain-1h"]
  }

  statement {
    sid    = "ManageSsmParameters"
    effect = "Allow"
    actions = [
      "ssm:AddTagsToResource",
      "ssm:DeleteParameter",
      "ssm:GetParameter",
      "ssm:GetParameters",
      "ssm:ListTagsForResource",
      "ssm:PutParameter",
      "ssm:RemoveTagsFromResource",
    ]
    resources = [
      "arn:${local.partition}:ssm:${var.AwsRegion}:${local.account_id}:parameter/deploy/${var.DeployEnvironment}/*",
      "arn:${local.partition}:ssm:${var.AwsRegion}:${local.account_id}:parameter/sns/*",
      "arn:${local.partition}:ssm:${var.AwsRegion}:${local.account_id}:parameter/iot/*",
    ]
  }

  statement {
    sid       = "FindSsmParameters"
    effect    = "Allow"
    actions   = ["ssm:DescribeParameters"]
    resources = ["*"]
  }
}

data "aws_iam_policy_document" "deploy_dns" {
  statement {
    sid    = "ManageRoute53"
    effect = "Allow"
    actions = [
      "route53:ChangeResourceRecordSets",
      "route53:GetChange",
      "route53:GetHostedZone",
      "route53:ListResourceRecordSets",
      "route53:ListTagsForResource",
    ]
    resources = concat(local.hosted_zone_arns, ["arn:${local.partition}:route53:::change/*"])
  }

  statement {
    sid    = "FindRoute53Zones"
    effect = "Allow"
    actions = [
      "route53:ListHostedZones",
      "route53:ListHostedZonesByName",
    ]
    resources = ["*"]
  }

  statement {
    sid    = "ManageSesDomain"
    effect = "Allow"
    actions = [
      "ses:DeleteIdentity",
      "ses:GetIdentityDkimAttributes",
      "ses:GetIdentityMailFromDomainAttributes",
      "ses:GetIdentityVerificationAttributes",
      "ses:SetIdentityMailFromDomain",
      "ses:VerifyDomainDkim",
      "ses:VerifyDomainIdentity",
    ]
    resources = ["*"]
  }

  statement {
    sid    = "ReadCertificates"
    effect = "Allow"
    actions = [
      "acm:DescribeCertificate",
      "acm:ListCertificates",
      "acm:ListTagsForCertificate",
    ]
    resources = ["*"]
  }
}

data "aws_iam_policy_document" "deploy_iot" {
  statement {
    sid    = "ManageIot"
    effect = "Allow"
    actions = [
      "iot:AttachPolicy",
      "iot:CreateKeysAndCertificate",
      "iot:CreatePolicy",
      "iot:DeleteCertificate",
      "iot:DeletePolicy",
      "iot:DescribeCertificate",
      "iot:DescribeEndpoint",
      "iot:DescribePolicy",
      "iot:DetachPolicy",
      "iot:GetPolicy",
      "iot:ListAttachedPolicies",
      "iot:ListPolicyVersions",
      "iot:ListTagsForResource",
      "iot:ListTargetsForPolicy",
      "iot:TagResource",
      "iot:UntagResource",
      "iot:UpdateCertificate",
    ]
    resources = ["*"]
  }

  statement {
    sid    = "ReadVodCloudFormationStack"
    effect = "Allow"
    actions = [
      "cloudformation:DescribeStacks",
      "cloudformation:GetTemplate",
      "cloudformation:ListStackResources",
    ]
    resources = ["arn:${local.partition}:cloudformation:${var.AwsRegion}:${local.account_id}:stack/vod-transcode-stack/*"]
  }
}

locals {
  deploy_policy_documents = {
    storage       = data.aws_iam_policy_document.deploy_storage.json
    compute       = data.aws_iam_policy_document.deploy_compute.json
    iam           = data.aws_iam_policy_document.deploy_iam.json
    identity-edge = data.aws_iam_policy_document.deploy_identity_edge.json
    integration   = data.aws_iam_policy_document.deploy_integration.json
    dns           = data.aws_iam_policy_document.deploy_dns.json
    iot           = data.aws_iam_policy_document.deploy_iot.json
  }
}

resource "aws_iam_policy" "deploy" {
  for_each = local.deploy_policy_documents

  name        = "${var.role_name}-${each.key}"
  description = "Deploy permissions for ${var.github_owner}/${var.github_repo} GitHub Actions."
  policy      = each.value
}

resource "aws_iam_role_policy_attachment" "deploy" {
  for_each = aws_iam_policy.deploy

  role       = aws_iam_role.github_deploy.name
  policy_arn = each.value.arn
}
