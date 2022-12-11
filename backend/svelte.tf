resource "null_resource" "sync_s3_svelte" {

  provisioner "local-exec" {
    command = "./buildAndPush.sh"
    working_dir = "${path.module}/../frontend"
    environment = {
        BucketName= aws_s3_bucket.svelteBucket.id
    }
  }

  depends_on = [ aws_s3_bucket.svelteBucket ,
	local_file.publish_bash_targets,
	local_file.counterfeitAmplifySettings
	]
}
