import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// preserveLegacyPage.sh runs in the deploy and keeps the previous frontend's entry
// page as index_legacy.html. It cannot be tried against the real bucket here, so
// these run it against a fake `aws` that models the bucket as a folder.
const script = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "preserveLegacyPage.sh"
);
const MARKER = '<meta name="frontend-generation" content="svelte5">';
const OLD_PAGE = "<html><!-- the old frontend --></html>";
const NEW_PAGE = `<html>${MARKER}<!-- the new frontend --></html>`;

const FAKE_AWS = `#!/bin/bash
echo "$@" >> "$FAKE_LOG"
key_of() { local u="$1"; u="\${u#s3://*/}"; echo "$u"; }
if [[ "$1 $2" == "s3api head-object" ]]; then
  while [[ $# -gt 0 ]]; do [[ "$1" == "--key" ]] && key="$2"; shift; done
  if [[ -n "\${FAKE_HEAD_ERROR:-}" ]]; then
    echo "An error occurred (403) when calling the HeadObject operation: Forbidden" >&2; exit 254
  fi
  [[ -f "$FAKE_BUCKET/$key" ]] && exit 0
  echo "An error occurred (404) when calling the HeadObject operation: Not Found" >&2; exit 254
fi
if [[ "$1 $2" == "s3 cp" ]]; then
  src="$3"; dst="$4"
  if [[ "$dst" == "-" ]]; then cat "$FAKE_BUCKET/$(key_of "$src")"; exit 0; fi
  cp "$FAKE_BUCKET/$(key_of "$src")" "$FAKE_BUCKET/$(key_of "$dst")"; exit 0
fi
echo "fake aws: unsupported: $*" >&2; exit 2
`;

function run({ build = NEW_PAGE, bucket = {}, headError = false } = {}) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-"));
    fs.mkdirSync(path.join(dir, "public"));
    fs.writeFileSync(path.join(dir, "public", "index.html"), build);
    fs.mkdirSync(path.join(dir, "bucket"));
    for (const [key, body] of Object.entries(bucket)) {
        fs.writeFileSync(path.join(dir, "bucket", key), body);
    }
    fs.mkdirSync(path.join(dir, "bin"));
    fs.writeFileSync(path.join(dir, "bin", "aws"), FAKE_AWS, { mode: 0o755 });
    const log = path.join(dir, "aws.log");
    fs.writeFileSync(log, "");
    const result = spawnSync("bash", [script], {
        cwd: dir,
        encoding: "utf8",
        env: {
            ...process.env,
            PATH: `${path.join(dir, "bin")}:${process.env.PATH}`,
            DERBY_SPA_S3_BUCKET: "test-bucket",
            FAKE_LOG: log,
            FAKE_BUCKET: path.join(dir, "bucket"),
            FAKE_HEAD_ERROR: headError ? "1" : "",
        },
    });
    const read = (key) => {
        const file = path.join(dir, "bucket", key);
        return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
    };
    return {
        status: result.status,
        output: result.stdout + result.stderr,
        calls: fs.readFileSync(log, "utf8").trim().split("\n").filter(Boolean),
        legacy: read("index_legacy.html"),
        live: read("index.html"),
    };
}

test("keeps the live old page as index_legacy.html before the new one replaces it", () => {
    const r = run({ bucket: { "index.html": OLD_PAGE } });

    assert.equal(r.status, 0, r.output);
    assert.equal(r.legacy, OLD_PAGE);
    assert.equal(
        r.live,
        OLD_PAGE,
        "the live page is left for the normal deploy to replace"
    );
    assert.ok(
        r.calls.some((c) => c.includes("--metadata-directive COPY")),
        "the copy keeps the page's cache headers"
    );
    assert.match(r.output, /kept the live index.html/);
});

test("never replaces a legacy page that already exists", () => {
    const r = run({
        bucket: {
            "index.html": OLD_PAGE,
            "index_legacy.html": "<html>the first one</html>",
        },
    });

    assert.equal(r.status, 0, r.output);
    assert.equal(r.legacy, "<html>the first one</html>");
    assert.match(r.output, /already exists/);
});

test("does not save a page from an earlier new-frontend deploy as the legacy page", () => {
    const r = run({ bucket: { "index.html": NEW_PAGE } });

    assert.equal(r.status, 0, r.output);
    assert.equal(r.legacy, null);
    assert.match(r.output, /already the new frontend/);
});

test("recognizes the marker whether or not the page was minified with quotes", () => {
    const unquoted =
        "<html><meta name=frontend-generation content=svelte5></html>";

    const liveIsNew = run({ bucket: { "index.html": unquoted } });
    assert.equal(liveIsNew.legacy, null);
    assert.match(liveIsNew.output, /already the new frontend/);

    const buildIsNew = run({
        build: unquoted,
        bucket: { "index.html": OLD_PAGE },
    });
    assert.equal(buildIsNew.legacy, OLD_PAGE);
});

test("does nothing when the build being deployed is not the new frontend", () => {
    const r = run({ build: OLD_PAGE, bucket: { "index.html": OLD_PAGE } });

    assert.equal(r.status, 0, r.output);
    assert.equal(r.legacy, null);
    assert.deepEqual(r.calls, [], "no bucket access at all");
});

test("does nothing on the very first deploy, when there is no live page", () => {
    const r = run({ bucket: {} });

    assert.equal(r.status, 0, r.output);
    assert.equal(r.legacy, null);
    assert.match(r.output, /first deploy/);
});

test("stops the deploy on an unexpected error instead of silently skipping", () => {
    const r = run({ bucket: { "index.html": OLD_PAGE }, headError: true });

    assert.notEqual(r.status, 0);
    assert.equal(r.legacy, null);
    assert.match(r.output, /unexpected error/);
});

test("the script is executable and has valid shell syntax", () => {
    assert.ok(
        fs.statSync(script).mode & 0o111,
        "run by deploy.yml as ./preserveLegacyPage.sh"
    );
    execFileSync("bash", ["-n", script]);
});
