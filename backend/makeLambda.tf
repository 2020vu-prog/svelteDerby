resource "null_resource" "make_lambda" {

  provisioner "local-exec" {
    command = "make"
    working_dir = "${path.module}"
  }

}
