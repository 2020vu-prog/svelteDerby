locals {
  s3_svelte_origin_id = "s3SvelteOrigin"
  s3_archive_origin_id = "s3ArchiveOrigin"
    app_origin_id= "lambdaApiGateway"
}
resource "aws_s3_bucket" "svelteBucket" {
  bucket_prefix="svelte"
  acl    = "private"

}
data "aws_iam_policy_document" "s3_svelte_policy" {
  statement {
    actions   = ["s3:GetObject"]
    resources = [
	"${aws_s3_bucket.svelteBucket.arn}/*"
    ]

    principals {
      type        = "AWS"
      identifiers = [aws_cloudfront_origin_access_identity.svelte_oaid.iam_arn]
    }
  }

  statement {
    actions   = ["s3:ListBucket"]
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
    actions   = ["s3:GetObject"]
    resources = [
	"${aws_s3_bucket.dstBucket.arn}/*"
    ]

    principals {
      type        = "AWS"
      identifiers = [aws_cloudfront_origin_access_identity.svelte_oaid.iam_arn]
    }
  }

  statement {
    actions   = ["s3:ListBucket"]
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
    command = "scripts/syncS3ChartData.sh"
    working_dir = path.module
    environment = {
    	BucketName= aws_s3_bucket.svelteBucket.id
    }
  }

  depends_on = [ aws_s3_bucket.svelteBucket ]
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
    //domain_name = aws_api_gateway_deployment.derbyMain.invoke_url
    domain_name = "05wv6js1p4.execute-api.us-east-2.amazonaws.com"
    origin_path = "/test"
	
    origin_id   = local.app_origin_id

    custom_origin_config {
         origin_protocol_policy = "https-only"
         origin_ssl_protocols = ["TLSv1.2"]
         http_port=80
         https_port=443

    }
  }


  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Terraform cdn"
  default_root_object = "index.html"


  aliases = ["cf.derby.rr1.us"]

  default_cache_behavior {
    allowed_methods  = [ "GET", "HEAD", "OPTIONS" ]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.s3_svelte_origin_id

    forwarded_values {
      query_string = false

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

  price_class = "PriceClass_200"

  restrictions {
    geo_restriction {
      restriction_type = "whitelist"
      locations        = ["US", "CA" ]
    }
  }

  tags = {
    Environment = "test"
  }

  #viewer_certificate {
  #  cloudfront_default_certificate = true
  #}
  viewer_certificate {
    #  cloudfront mandates that the key reside in US-EAST-1
    acm_certificate_arn=	"arn:aws:acm:us-east-1:983366471359:certificate/f2960a90-d944-4c2a-96aa-f6bb861fed50"
    minimum_protocol_version = "TLSv1.1_2016"
    ssl_support_method = "sni-only"
  }
}

data "aws_route53_zone" "derby_zone" {
  name = "derby.rr1.us"
}      

resource "aws_route53_record" "www_cf" {
  zone_id = data.aws_route53_zone.derby_zone.zone_id
  name    = "cf.derby.rr1.us"
  type    = "A"



  alias {
    name = aws_cloudfront_distribution.derbyApp.domain_name
    zone_id = aws_cloudfront_distribution.derbyApp.hosted_zone_id
    evaluate_target_health = false

  }
}

