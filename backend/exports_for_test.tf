resource "local_file" "testCognitoSettings" {
    filename = "${path.module}/test/aws-exports.json"

    content     = <<-EOT
{
    "aws_project_region": "${data.aws_region.current.name}",
    "aws_cognito_identity_pool_id": "${aws_cognito_identity_pool.derbyMainIdp.id}",
    "aws_cognito_region": "${data.aws_region.current.name}",
    "aws_cognito_client_id": "${aws_cognito_user_pool_client.sveltePoolClient.id}",
    "aws_user_pools_id": "${aws_cognito_user_pool.derbyUserPool.id}",
    "aws_user_pools_web_client_id": "${aws_cognito_user_pool_client.sveltePoolClient.id}",
    "aws_pubsub_region": "${data.aws_region.current.name}",
    "aws_pubsub_endpoint": "wss://${data.aws_iot_endpoint.mqtt.endpoint_address}/mqtt",
    "aws_pubsub_host": "${data.aws_iot_endpoint.mqtt.endpoint_address}",
	"DERBY_SPA_S3_BUCKET":"${aws_s3_bucket.svelteBucket.id}",
	"DERBY_CLOUDFRONT":"https://${aws_cloudfront_distribution.derbyApp.domain_name}"
}
  EOT
}
