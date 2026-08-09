# Cache-alignment Lambda

`sqsCcaMain` consumes cache-alignment requests from the FIFO
`derby-cache-alignment` SQS queue. It consolidates distribution records into an
S3 archive and removes the consolidated records from the distribution table.

The Lambda runs on Node 22 and bundles the AWS SDK for JavaScript v3 clients it
uses. It does not depend on an SDK supplied by the Lambda runtime.

## Request format

The SQS record body is JSON produced by `DdbUtils.requestCC()`. The handler uses
these fields:

```json
{
  "orgId": "organization-id",
  "orgIz": "organization-path-segment",
  "ccType": "CCA"
}
```

`ccType` has two supported values:

- `CCA` performs routine cache alignment. Requests for the same organization
  are guarded by a 20-minute optimistic lock stored in the distribution table.
- `CCF` performs final archive consolidation and bypasses the CCA lock.

Other fields from the originating query object may be present but are not used
directly by this Lambda. `orgIz` is the existing field name used for the S3 path;
it is intentionally different from `orgId`.

## Processing flow

For each SQS record, the handler:

1. Parses the record body.
2. Acquires or checks the DynamoDB CCA lock when `ccType` is `CCA`.
3. Queries the distribution table for records whose partition key is `orgId`.
4. Loads the previous archive referenced by any existing CCA record.
5. Writes the combined records to S3.
6. Writes a new CCA pointer record to the distribution table.
7. Deletes the distribution records included in the new archive.

Routine archives are written to:

```text
archive/{orgIz}/{orgId}/{timestamp}.json
```

Final (`CCF`) archives overwrite:

```text
archive/{orgIz}/{orgId}/archive.json
```

The Terraform event-source mapping accepts batches of up to 10 SQS records.

## AWS resources and permissions

Terraform supplies the queue ARN, distribution and main DynamoDB table ARNs,
destination S3 bucket, AWS region, and managed-role permissions boundary. The
Lambda role can:

- Receive and delete messages from the cache-alignment queue.
- Query, read, write, and batch-write the configured DynamoDB tables.
- Read and write objects in the destination S3 bucket.
- Write CloudWatch Logs.

See `main.tf` for the complete Terraform inputs, environment variables, and IAM
policy.

## Failure behavior

The event-source mapping enables partial batch failure responses. If processing
fails, the handler stops at the first failed record to preserve FIFO ordering
and returns that record plus the remaining unprocessed records for SQS to
retry. DynamoDB batch-write errors and unprocessed requests are treated as
failures rather than successful writes of zero items.

A duplicate `CCA` request encountered during the 20-minute lock window remains
intentionally suppressed and is not retried.

If a `CCA` request acquired its organization lock before failing, the handler
marks that same lock stale before returning the failure. This lets the SQS retry
run immediately instead of being blocked by the 20-minute lock window. The
conditional lock release cannot overwrite a lock subsequently acquired by a
different invocation.

## Build and validation

From `backend/modules/lambdaSqs/src`:

```bash
npm ci
npm audit --omit=dev
make package.zip
```

`make package.zip` uses the repository's deterministic Lambda ZIP builder. The
`bundledDependencies` list in `package.json` must contain every direct runtime
dependency that belongs in the deployment ZIP.

A basic Node 22 smoke test is:

```bash
AwsRegion=us-east-2 npx --yes node@22 -e \
  'const lambda = require("./ccaMain"); lambda.handler({ Records: [] })'
```

Run the module's unit tests with:

```bash
npm test
```

The tests use Node's built-in test runner and mock the AWS SDK v3 clients; they
do not access an AWS account. The deployment workflow tests and packages this
module in a dedicated Node 22 step. It then restores Node 18 and runs
`make lambdaPkgsLegacy` for the older Lambda modules before planning Terraform.
