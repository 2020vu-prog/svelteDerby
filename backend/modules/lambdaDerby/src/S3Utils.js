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

module.exports = { getAllKeys };
