resource "aws_s3_object" "boot-sns-objects" {
  for_each    = fileset("src/sns", "*")
  bucket      = module.boot_bucket.s3_bucket_id
  key         = "sns/${each.value}"
  source      = "src/sns/${each.value}"
  source_hash = filemd5("src/sns/${each.value}")
}
resource "aws_s3_object" "boot-airhorn-objects" {
  for_each    = fileset("src/airhorn", "*")
  bucket      = module.boot_bucket.s3_bucket_id
  key         = "airhorn/${each.value}"
  source      = "src/airhorn/${each.value}"
  source_hash = filemd5("src/airhorn/${each.value}")
}
