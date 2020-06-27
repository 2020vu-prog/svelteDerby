# Stand up AWS infrastructure
* copy awsVarTemplate.sh to a private file (probably outside of the git tree)
* update the varTemplate with credentials for the AWS account and environment you will use
* source in the template
* run: terraform init
* run: terraform apply
# Table Structure notes
DynamoDB: Derby
		Drivers
		RaceStandings
		RacePhases

DynamoDB: Distribution
	KEYED by TIMESTAMP!!


getRaceHistory:   25 most recent records from Distribution
		(if this list hits limit... write to Sqs: CCA cache Alignment)

terraform: TODO
