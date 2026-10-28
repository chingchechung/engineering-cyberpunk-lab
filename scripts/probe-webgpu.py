#!/usr/bin/env python3
"""Optional full-app startup diagnostic; a canvas is not a visual-parity pass."""
import argparse
import os
import base64
import hashlib
import json
from pathlib import Path
import subprocess
from playwright.sync_api import sync_playwright, TimeoutError

parser = argparse.ArgumentParser()
parser.add_argument("--origin", default="https://127.0.0.1:5173")
parser.add_argument("--cafile", required=True)
parser.add_argument("--software-webgpu", action="store_true")
parser.add_argument("--output", default="/tmp/engineering-lab-webgpu")
args = parser.parse_args()
pub = subprocess.check_output(["openssl", "x509", "-in", args.cafile, "-pubkey", "-noout"])
der = subprocess.run(["openssl", "pkey", "-pubin", "-outform", "der"], input=pub, capture_output=True, check=True).stdout
spki = base64.b64encode(hashlib.sha256(der).digest()).decode()
launch = ["--no-sandbox", "--ignore-certificate-errors-spki-list=" + spki]
if args.software_webgpu:
    launch.extend(["--enable-unsafe-webgpu", "--use-angle=swiftshader"])
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get("CHROMIUM_EXECUTABLE", "/usr/bin/chromium"), args=launch)
    page = browser.new_page(viewport={"width": 960, "height": 640})
    messages, errors = [], []
    page.on("console", lambda message: messages.append({"type": message.type, "text": message.text})
            if message.type in ["error", "warning"] or "[renderer]" in message.text else None)
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(args.origin, wait_until="domcontentloaded")
    try:
        page.get_by_role("button", name="ENTER", exact=True).click(timeout=40000)
        page.wait_for_timeout(7000)
    except TimeoutError:
        errors.append("Startup/ENTER timeout")
    result = page.evaluate("""async () => ({secure:isSecureContext,
      adapter:!!(await navigator.gpu?.requestAdapter()), canvas:!!document.querySelector('canvas'),
      educationHud:!!document.querySelector('.education-hud:not([hidden])'),
      terminals:window.__app?.scene.getObjectByName('education-terminals')?.children.length??null,
      matrix:window.__app?.scene.getObjectByName('MatrixExtension')?.name??null,
      matrixGrounds:window.__app?.scene.getObjectByName('MatrixGround')?.children.length??null,
      loader:document.querySelector('#app-loader')?.getAttribute('aria-label')??null})""")
    result.update(messages=messages[:12], errors=list(dict.fromkeys(errors))[:6], error_count=len(errors))
    Path(args.output + ".json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    page.screenshot(path=args.output + ".png")
    print(json.dumps(result, indent=2))
    browser.close()
    raise SystemExit(2 if errors or any(message["type"] == "error" for message in messages) else 0)
