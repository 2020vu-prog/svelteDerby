resource "null_resource" "sync_s3_svelte" {

  provisioner "local-exec" {
    command     = "./buildAndPush.sh"
    working_dir = "${path.module}/../frontend"
    environment = {
      BucketName                = aws_s3_bucket.svelteBucket.id
      DERBY_SPA_S3_BUCKET       = aws_s3_bucket.svelteBucket.id
      DERBY_CLOUDFRONT          = "https://${aws_cloudfront_distribution.derbyApp.domain_name}"
      TF_VAR_DeployEnvironment  = var.DeployEnvironment
    }
  }

  depends_on = [aws_s3_bucket.svelteBucket,
    aws_ssm_parameter.frontend_s3_bucket,
    aws_ssm_parameter.frontend_cloudfront_url,
    local_file.counterfeitAmplifySettings
  ]
}
