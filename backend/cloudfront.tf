variable "AcmArn" {}
variable "TimerApiGatewayDomain" {
  // legacy default that was previously hard-coded
  default = "cfxgbxl7d9.execute-api.us-east-2.amazonaws.com"
}
variable "DnsDomain" {
  default = "derby.rr1.us"
}

variable "DnsCloudfrontHostAlias" {
  default = "cf"
}
locals {
  s3_svelte_origin_id  = "s3SvelteOrigin"
  s3_archive_origin_id = "s3ArchiveOrigin"
  app_timer_origin_id  = "lambdaTimerApiGateway"
  app_origin_id        = "lambdaDerbyMainFunctionUrl"
  useRoute53DnsCount   = local.use_default_cert ? 0 : 1
  use_default_cert     = var.AcmArn == ""
  //invoke_host_temp     = replace(aws_api_gateway_deployment.derbyMain.invoke_url, "https://", "")
  //invoke_host          = replace(local.invoke_host_temp, "/\\/.*/", "")

  derbyMain_host_temp = replace(module.derbyMainLambda.lambda_function_url, "https://", "")
  derbyMain_host      = replace(local.derbyMain_host_temp, "/\\/.*/", "")
  DnsCfAliasFq        = "${var.DnsCloudfrontHostAlias}.${var.DnsDomain}"

}
resource "aws_s3_bucket" "svelteBucket" {
  bucket_prefix = "svelte-static-"
  force_destroy = true

}
resource "aws_s3_bucket_acl" "svelteBucket" {
  depends_on = [aws_s3_bucket_ownership_controls.svelteBucket]
  bucket     = aws_s3_bucket.svelteBucket.id
  acl        = "private"
}
resource "aws_s3_bucket_ownership_controls" "svelteBucket" {
  bucket = aws_s3_bucket.svelteBucket.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}
resource "aws_s3_bucket" "cdnLogBucket" {
  bucket_prefix = "svelte-cdn-logs"
  force_destroy = true
}
resource "aws_s3_bucket_lifecycle_configuration" "cdnLogBucket" {
  bucket = aws_s3_bucket.cdnLogBucket.id
  rule {
    id     = "log"
    status = "Enabled"



    abort_incomplete_multipart_upload {
      days_after_initiation = 2
    }
    expiration {
      days = 90
    }
  }

}
resource "aws_s3_bucket_acl" "cdnLogBucket_acl" {
  depends_on = [aws_s3_bucket_ownership_controls.cdnLogBucket]

  bucket = aws_s3_bucket.cdnLogBucket.id
  acl    = "private"
}
resource "aws_s3_bucket_ownership_controls" "cdnLogBucket" {
  bucket = aws_s3_bucket.cdnLogBucket.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

data "aws_iam_policy_document" "s3_svelte_policy" {
  statement {
    actions = ["s3:GetObject"]
    resources = [
      "${aws_s3_bucket.svelteBucket.arn}/*"
    ]

    principals {
      type        = "AWS"
      identifiers = [aws_cloudfront_origin_access_identity.svelte_oaid.iam_arn]
    }
  }

  statement {
    actions = ["s3:ListBucket"]
    resources = [
      aws_s3_bucket.svelteBucket.arn
    ]

    principals {
      type        = "AWS"
      identifiers = [aws_cloudfront_origin_access_identity.svelte_oaid.iam_arn]
    }
  }
}
data "aws_iam_policy_document" "s3_dst_policy" {
  statement {
    actions = ["s3:GetObject"]
    resources = [
      "${aws_s3_bucket.dstBucket.arn}/*"
    ]

    principals {
      type        = "AWS"
      identifiers = [aws_cloudfront_origin_access_identity.svelte_oaid.iam_arn]
    }
  }

  statement {
    actions = ["s3:ListBucket"]
    resources = [
      aws_s3_bucket.dstBucket.arn
    ]

    principals {
      type        = "AWS"
      identifiers = [aws_cloudfront_origin_access_identity.svelte_oaid.iam_arn]
    }
  }
}

resource "aws_s3_bucket_policy" "sveltePolicy" {
  bucket = aws_s3_bucket.svelteBucket.id
  policy = data.aws_iam_policy_document.s3_svelte_policy.json
}

resource "aws_s3_bucket_policy" "dstPolicy" {
  bucket = aws_s3_bucket.dstBucket.id
  policy = data.aws_iam_policy_document.s3_dst_policy.json
}

resource "aws_cloudfront_origin_access_identity" "svelte_oaid" {
  comment = "Svelte origin access"
}

resource "null_resource" "sync_s3_chart_data" {

  provisioner "local-exec" {
    command     = "scripts/syncS3ChartData.sh"
    working_dir = path.module
    environment = {
      BucketName = aws_s3_bucket.svelteBucket.id
    }
  }

  depends_on = [aws_s3_bucket.svelteBucket]
}

resource "aws_cloudfront_distribution" "derbyApp" {
  origin {
    domain_name = aws_s3_bucket.svelteBucket.bucket_regional_domain_name
    origin_id   = local.s3_svelte_origin_id

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.svelte_oaid.cloudfront_access_identity_path
    }
  }
  origin {
    domain_name = aws_s3_bucket.dstBucket.bucket_regional_domain_name
    origin_id   = local.s3_archive_origin_id

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.svelte_oaid.cloudfront_access_identity_path
    }
  }

  origin {
    //domain_name = "05wv6js1p4.execute-api.us-east-2.amazonaws.com"
    //domain_name = local.invoke_host
    domain_name = local.derbyMain_host
    //origin_path = "/"

    origin_id = local.app_origin_id

    custom_origin_config {
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
      http_port              = 80
      https_port             = 443

    }
  }
  origin {
    domain_name = var.TimerApiGatewayDomain // from serverless
    origin_path = "/dev"

    origin_id = local.app_timer_origin_id

    custom_origin_config {
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
      http_port              = 80
      https_port             = 443

    }
  }


  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Terraform cdn"
  default_root_object = "index.html"
  http_version        = "http2and3"


  aliases = local.use_default_cert ? null : [local.DnsCfAliasFq, var.DnsDomain]

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.s3_svelte_origin_id

    forwarded_values {
      query_string = true
      query_string_cache_keys = [
        "cacheKey"
      ]

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }

  # Cache behavior with precedence 0
  ordered_cache_behavior {
    path_pattern     = "/static/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = local.s3_svelte_origin_id

    forwarded_values {
      query_string = false
      headers      = ["Origin"]

      cookies {
        forward = "none"
      }
    }

    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
  }

  # Cache behavior with precedence 1
  ordered_cache_behavior {
    path_pattern     = "/app/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.app_origin_id

    forwarded_values {
      headers = [
        "Authorization",
      ]
      query_string = true

      cookies {
        forward = "none"
      }
    }

    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 31536000
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
  }
  # Cache behavior with precedence 1(a)
  ordered_cache_behavior {
    path_pattern     = "/timer/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.app_timer_origin_id

    forwarded_values {
      query_string = true

      cookies {
        forward = "none"
      }
    }

    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
  }

  # Cache behavior with precedence 2
  ordered_cache_behavior {
    path_pattern     = "/archive/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = local.s3_archive_origin_id

    forwarded_values {
      query_string = false
      headers      = ["Origin"]

      cookies {
        forward = "none"
      }
    }

    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
  }


  # Cache behavior with precedence 3
  #    currently same as archive s3 bucket with a different path (/media)
  ordered_cache_behavior {
    path_pattern     = "/media/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = local.s3_archive_origin_id

    forwarded_values {
      query_string = false
      headers      = ["Origin"]

      cookies {
        forward = "none"
      }
    }

    min_ttl                = 86400
    default_ttl            = 86400
    max_ttl                = 31536000
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
  }

  #price_class = "All"

  price_class = "PriceClass_200"
  restrictions {
    geo_restriction {
      restriction_type = "whitelist"
      locations        = ["US", "CA", "BZ", "FR"]
    }
  }

  tags = {
    Environment = "test"
  }

  ### https://discuss.hashicorp.com/t/how-do-write-an-if-else-block/2563/2
  viewer_certificate {
    #  cloudfront mandates that the key reside in US-EAST-1
    acm_certificate_arn            = local.use_default_cert ? null : var.AcmArn
    minimum_protocol_version       = local.use_default_cert ? null : "TLSv1.2_2019"
    ssl_support_method             = local.use_default_cert ? null : "sni-only"
    cloudfront_default_certificate = local.use_default_cert
  }
  #viewer_certificate {
  #  cloudfront_default_certificate = true
  #}
  #viewer_certificate {
  #  acm_certificate_arn=var.AcmArn
  #  minimum_protocol_version = "TLSv1.1_2016"
  #  ssl_support_method = "sni-only"
  #}
  logging_config {
    include_cookies = false
    bucket          = "${aws_s3_bucket.cdnLogBucket.id}.s3.amazonaws.com"
    prefix          = "svelte"
  }
}

data "aws_route53_zone" "derby_zone" {
  count = local.useRoute53DnsCount
  name  = var.DnsDomain
}

resource "aws_route53_record" "www_cf" {
  count   = local.useRoute53DnsCount
  zone_id = data.aws_route53_zone.derby_zone[0].zone_id
  name    = local.DnsCfAliasFq
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.derbyApp.domain_name
    zone_id                = aws_cloudfront_distribution.derbyApp.hosted_zone_id
    evaluate_target_health = false
  }
}
resource "aws_route53_record" "base_cf" {
  count   = local.useRoute53DnsCount
  zone_id = data.aws_route53_zone.derby_zone[0].zone_id
  name    = var.DnsDomain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.derbyApp.domain_name
    zone_id                = aws_cloudfront_distribution.derbyApp.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_ssm_parameter" "frontend_s3_bucket" {
  name = "/deploy/${var.DeployEnvironment}/frontend/s3-bucket"

  description = "S3 bucket used by frontend deployment"
  type        = "String"
  value       = aws_s3_bucket.svelteBucket.id
}

resource "aws_ssm_parameter" "frontend_cloudfront_url" {
  name = "/deploy/${var.DeployEnvironment}/frontend/cloudfront-url"

  description = "CloudFront URL for frontend deployment"
  type        = "String"
  value       = "https://${aws_cloudfront_distribution.derbyApp.domain_name}"
}
