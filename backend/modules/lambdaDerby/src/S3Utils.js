const { ListObjectsV2Command } = require("@aws-sdk/client-s3");

async function getAllKeys(s3Client, params, allKeys = []) {
    const response = await s3Client.send(new ListObjectsV2Command(params));
    const contents = response.Contents || [];
    contents.forEach((object) =>
        allKeys.push({
            Key: object.Key,
            LastModified: object.LastModified,
        })
    );

    if (response.NextContinuationToken) {
        await getAllKeys(
            s3Client,
            {
                ...params,
                ContinuationToken: response.NextContinuationToken,
            },
            allKeys
        );
    }
    return allKeys;
}

function decodeS3EventKey(key) {
    return decodeURIComponent(key.replace(/\+/g, " "));
}

function encodeS3CopySource(bucket, key) {
    const encodedKey = key.split("/").map(encodeURIComponent).join("/");
    return `/${bucket}/${encodedKey}`;
}

module.exports = { decodeS3EventKey, encodeS3CopySource, getAllKeys };
