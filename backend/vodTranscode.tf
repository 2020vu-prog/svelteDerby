

module "vodTranscode" {
  source = "./modules/vodTranscode"

  DeployEnvironment = var.DeployEnvironment
  AwsRegion         = var.AwsRegion

}

output "WatchFolderBucket" {
  value = module.vodTranscode.WatchFolderBucket
}
output "MediaBucket" {
  value = module.vodTranscode.MediaBucket
}
