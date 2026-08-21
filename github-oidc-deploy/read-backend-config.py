#!/usr/bin/env python3

import hashlib
import json
import os
import re
import sys


backend_config_file = os.environ.get("TF_BACKEND_CONFIG", "")
if not backend_config_file:
    print(json.dumps({"bucket": "", "dynamodb_table": "", "sha256": ""}))
    sys.exit(0)

try:
    with open(backend_config_file, "rb") as source:
        contents = source.read()
except OSError as error:
    print(f"Unable to read TF_BACKEND_CONFIG file: {error}", file=sys.stderr)
    sys.exit(1)

text = contents.decode("utf-8")


def quoted_value(name):
    matches = re.findall(rf'^\s*{name}\s*=\s*"([^"]+)"', text, re.MULTILINE)
    return matches[-1] if matches else ""


bucket = quoted_value("bucket")
if not bucket:
    print("TF_BACKEND_CONFIG does not contain a quoted bucket value.", file=sys.stderr)
    sys.exit(1)

print(
    json.dumps(
        {
            "bucket": bucket,
            "dynamodb_table": quoted_value("dynamodb_table"),
            "sha256": hashlib.sha256(contents).hexdigest(),
        }
    )
)
