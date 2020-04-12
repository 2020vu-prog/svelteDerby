DynamoDB: Derby
		Drivers
		RaceStandings
		RacePhases

DynamoDB: Distribution
	KEYED by TIMESTAMP!!


getRaceHistory:   25 most recent records from Distribution
		(if this list hits limit... write to Sqs: CCA cache Alignment)
