#!/usr/bin/env python3
"""Check served entry modules and every public asset using verified local TLS."""
import argparse
import hashlib
import json
from html.parser import HTMLParser
from pathlib import Path
import ssl
from urllib.parse import urljoin, urlsplit
from urllib.request import urlopen


class EntryParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.resources = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "script" and attrs.get("type") == "module" and attrs.get("src"):
            self.resources.append(attrs["src"])
        if tag == "link" and attrs.get("rel") == "stylesheet" and attrs.get("href"):
            self.resources.append(attrs["href"])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--origin", required=True)
    parser.add_argument("--cafile", type=Path)
    args = parser.parse_args()
    context = ssl.create_default_context(cafile=str(args.cafile) if args.cafile else None)
    root = Path(__file__).resolve().parents[1]
    inventory = json.loads((root / "docs/assets-inventory.json").read_text(encoding="utf-8"))

    def fetch(path):
        with urlopen(urljoin(args.origin.rstrip("/") + "/", path), context=context, timeout=30) as response:
            if response.status != 200:
                raise RuntimeError(f"Unexpected status {response.status}: {path}")
            return response.read(), response.headers.get_content_type()

    html, content_type = fetch("/")
    if content_type != "text/html" or b"THREEJS" not in html.upper():
        raise RuntimeError("The upstream document was not served")
    entries = EntryParser()
    entries.feed(html.decode())
    if not any(urlsplit(path).path.endswith(".js") for path in entries.resources):
        raise RuntimeError("No module entry was found")
    for path in entries.resources:
        body, mime = fetch(path)
        if not body or mime == "text/html":
            raise RuntimeError(f"Entry resource missing or returned HTML: {path}")
    for asset in inventory["assets"]:
        body, _ = fetch(asset["path"].removeprefix("public/"))
        if hashlib.sha256(body).hexdigest() != asset["sha256"]:
            raise RuntimeError(f"Asset hash mismatch: {asset['path']}")
    print(f"PASS: document, {len(entries.resources)} entry resources, {len(inventory['assets'])} public assets")


if __name__ == "__main__":
    main()
