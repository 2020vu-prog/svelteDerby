const fs = require("fs");
const log = require("loglevel");
var StringDecoder = require("string_decoder").StringDecoder;
var path = require("path");

const fsPromises = fs.promises;

class TmpCache {
    ddbClient = null;
    AWS = null;
    s3 = null;
    constructor(AWS, ddbClient, s3Client) {
        this.ddbClient = ddbClient;
        this.AWS = AWS;
        this.s3 = s3Client;
    }
    get entityTypes() {
        return Object.keys(entityFactories);
    }
    async putObject(entityKey, entity) {
        const cachePath = this.getCachePath(entityKey);
        const pkDir = path.dirname(cachePath);
        //const pkDir = this.getCacheDir(entityKey);
        try {
            await fsPromises.mkdir(pkDir, { recursive: true });
            log.debug("created dir: ", pkDir);
        } catch (err) {}

        const flat = JSON.stringify(entity);
        log.debug("writing to file: ", cachePath, flat);
        try {
            await fsPromises.writeFile(cachePath, flat);
        } catch (err) {
            log.debug("failed to write file: ", cachePath, err);
        }
    }
    async ddbOrS3(entityKey) {
        if (entityKey.PK) {
            return await this.ddbCacheQueryPkSk(entityKey.PK, entityKey.SK);
        } else {
            return await this.getS3(entityKey.Bucket, entityKey.Key);
        }
    }
    async getObject(entityKey) {
        const cachePath = this.getCachePath(entityKey);
        log.debug("getObject entityKey:", entityKey, " cachePath:", cachePath);
        try {
            const json = await fsPromises.readFile(cachePath, "utf8");
            log.debug("getObject found in cache:", cachePath);
            return JSON.parse(json);
        } catch (err) {
            log.debug(
                "failed to read file: ",
                cachePath,
                " entityKey:",
                entityKey
            );
            const rc = await this.ddbOrS3(entityKey);
            log.debug("getObject cache miss: ", cachePath, " data: ", rc);
            if (rc) {
                await this.putObject(entityKey, rc); // cache for future reads.
            }
            return rc;
        }
    }
    getCacheDir(entity) {
        const x = entity.PK ? entity.PK : entity.Bucket;
        const pkDir = `/tmp/${x}`;
        return pkDir;
    }
    getCachePath(entity) {
        const x = entity.SK ? entity.SK : entity.Key;
        const pkDir = this.getCacheDir(entity);
        const cachePath = `${pkDir}/${x}`;
        return cachePath;
    }
    async getS3(bucket, key) {
        var params = {
            Bucket: bucket,
            Key: key,
        };
        try {
            const data = await this.s3.getObject(params).promise();
            log.debug("s3 getObject ok", data);

            const d = new StringDecoder("utf8");
            const rc = d.write(data.Body);
            return JSON.parse(rc);
        } catch (err) {
            log.debug("s3 getBucket Error", err);
            log.debug("s3 getBucket Params:", params);
            return null;
        }
    }
    async ddbCacheQueryPkSk(pk, sk) {
        const containsValues = {};
        containsValues[":pk"] = { S: pk };
        containsValues[":sk"] = { S: sk };
        const keyCondition = "PK = :pk and SK = :sk";

        var params = {
            TableName: process.env.DynamoDbTable,
            KeyConditionExpression: keyCondition,
            ReturnConsumedCapacity: "TOTAL",
            ExpressionAttributeValues: containsValues,
        };
        log.debug("ddbCacheQueryPkSk query: " + JSON.stringify(params));

        try {
            var data = await this.ddbClient.query(params);
            log.debug("ddbCacheQueryPkSk: ", data); // successful response
            for (var i = 0; i < data.Items.length; i++) {
                var unmarshalled = this.AWS.DynamoDB.Converter.unmarshall(
                    data.Items[i]
                );
                return unmarshalled;
                log.debug("ddbCacheQueryPkSk: returning", unmarshalled); // successful response
            }
        } catch (err) {
            log.debug("ddbCacheQueryPkSk failed: ", err, err.stack); // an error occurred
            throw err;
        }
    }
}
module.exports = TmpCache;
