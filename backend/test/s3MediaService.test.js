const path = require("path");

// Use the Lambda's own copy of the SDK, the one the service itself loads.
const lambdaSrc = path.join(__dirname, "../modules/lambdaDerby/src");
const { S3Client } = require(
    require.resolve("@aws-sdk/client-s3", {
        paths: [lambdaSrc],
    })
);
const S3MediaService = require("../modules/lambdaDerby/src/S3MediaService.js");

const ENV_KEYS = ["ChartS3BucketName", "DstBucket", "s3VideoWatch"];
let savedEnv;
let now;

beforeEach(() => {
    savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
    process.env.ChartS3BucketName = "charts-bucket";
    process.env.DstBucket = "dst-bucket";
    delete process.env.s3VideoWatch;
    now = jest.spyOn(Date, "now").mockReturnValue(1700000000000);
});

afterEach(() => {
    now.mockRestore();
    for (const key of ENV_KEYS) {
        if (savedEnv[key] === undefined) delete process.env[key];
        else process.env[key] = savedEnv[key];
    }
});

function fakeS3(...pages) {
    const send = jest.fn(async () => pages.shift() ?? {});
    return { send };
}

describe("s3QueryChartTypes", () => {
    test("lists the bracket chart files in the chart bucket", async () => {
        const listing = { Contents: [{ Key: "data/brackets/NDR/a.png" }] };
        const s3 = fakeS3(listing);
        const service = new S3MediaService(s3);

        await expect(service.s3QueryChartTypes()).resolves.toBe(listing);

        const command = s3.send.mock.calls[0][0];
        expect(command.constructor.name).toBe("ListObjectsV2Command");
        expect(command.input).toEqual({
            Bucket: "charts-bucket",
            Prefix: "data/brackets",
        });
    });

    test("returns an error object instead of throwing", async () => {
        const s3 = { send: jest.fn().mockRejectedValue(new Error("denied")) };

        await expect(
            new S3MediaService(s3).s3QueryChartTypes()
        ).resolves.toEqual({ error: "s3 list buckets Failed" });
    });
});

describe("s3QueryMediaPrefix", () => {
    test("lists media keys under the prefix, across pages, keeping only key and date", async () => {
        const s3 = fakeS3(
            {
                Contents: [
                    { Key: "media/o1/a.webm", LastModified: "d1", Size: 1 },
                    { Key: "media/o1/b.webm", LastModified: "d2", Size: 2 },
                ],
                NextContinuationToken: "next",
            },
            { Contents: [{ Key: "media/o1/c.webm", LastModified: "d3" }] }
        );
        const service = new S3MediaService(s3);

        await expect(
            service.s3QueryMediaPrefix({ prefix: "o1/" })
        ).resolves.toEqual([
            { Key: "media/o1/a.webm", LastModified: "d1" },
            { Key: "media/o1/b.webm", LastModified: "d2" },
            { Key: "media/o1/c.webm", LastModified: "d3" },
        ]);

        expect(s3.send.mock.calls.map(([command]) => command.input)).toEqual([
            { Bucket: "dst-bucket", Prefix: "media/o1/" },
            {
                Bucket: "dst-bucket",
                Prefix: "media/o1/",
                ContinuationToken: "next",
            },
        ]);
    });

    test("lists everything under media/ when there is no prefix", async () => {
        const s3 = fakeS3({});
        const service = new S3MediaService(s3);

        await expect(service.s3QueryMediaPrefix({})).resolves.toEqual([]);
        expect(s3.send.mock.calls[0][0].input.Prefix).toBe("media/");
    });

    test("fails without query string parameters (current behavior)", async () => {
        const service = new S3MediaService(fakeS3());

        await expect(service.s3QueryMediaPrefix(undefined)).rejects.toThrow(
            TypeError
        );
    });
});

describe("requestS3PutObjectUrl", () => {
    // Presigning is local, so this uses a real S3 client with fake credentials.
    const s3 = new S3Client({
        region: "us-east-2",
        credentials: { accessKeyId: "AKIAFAKEFAKEFAKE", secretAccessKey: "x" },
    });
    const service = new S3MediaService(s3);

    test("signs an upload to the org's media folder in the destination bucket", async () => {
        const result = await service.requestS3PutObjectUrl("org1", {
            key: "video one.webm",
        });

        const url = new URL(result.signedUrl);
        expect(url.host).toBe("dst-bucket.s3.us-east-2.amazonaws.com");
        expect(url.pathname).toBe("/media/org1/video%20one.webm");
        expect(url.searchParams.get("X-Amz-Expires")).toBe("600");
        expect(url.searchParams.get("X-Amz-Signature")).toBeTruthy();
        expect(result.issuedMs).toBe(1700000000000);
    });

    test("signs an upload to the watch bucket when one is configured", async () => {
        process.env.s3VideoWatch = "watch-bucket";

        const result = await service.requestS3PutObjectUrl("org1", {
            key: "v.webm",
        });

        const url = new URL(result.signedUrl);
        expect(url.host).toBe("watch-bucket.s3.us-east-2.amazonaws.com");
        // The watch bucket does not see sub directories, so the org is part
        // of the file name.
        expect(url.pathname).toBe("/inputs/org1-v.webm");
    });

    test("an empty watch bucket setting means the destination bucket", async () => {
        process.env.s3VideoWatch = "";

        const result = await service.requestS3PutObjectUrl("org1", {
            key: "v.webm",
        });

        expect(new URL(result.signedUrl).host).toBe(
            "dst-bucket.s3.us-east-2.amazonaws.com"
        );
    });
});
