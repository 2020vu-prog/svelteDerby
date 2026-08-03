##NOTE:
* Node 16.4.0 or newer is required for backend code that uses AsyncLocalStorage.
* Node 18 or newer is recommended for local development and current Lambda runtimes.

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

terraform: migrate from locall state to aws backend:
	terraform init --migrate-state -backend-config=$TF_BACKEND_CONFIG
