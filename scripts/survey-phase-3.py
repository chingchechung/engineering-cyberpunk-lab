#!/usr/bin/env python3
"""Record a test-only connected walking graph from the actual GLBs/controllers."""
import argparse
import base64
from collections import deque
import hashlib
import json
from pathlib import Path
import runpy
import subprocess
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


def finalize_survey(result):
    nodes = result["nodes"]
    # Keep the first four IDs spread across the west/east extent; the fifth is
    # the lower spur. The greedy selection itself uses graph walking distance.
    result["terminalNodes"] = dict(zip(["Q01", "Q02", "Q03", "Q04", "Q05"],
                                       [result["selected"][i] for i in [1, 3, 2, 0, 4]]))
    centers = set(result["terminalNodes"].values())
    allowed = (set(result["candidates"]) | {0}) - centers

    def route(start, target, include_target=False):
        permitted = allowed | ({target} if include_target else set())
        queue, parents = deque([start]), {start: None}
        while queue:
            current = queue.popleft()
            if current == target:
                break
            for adjacent in nodes[current]["edges"]:
                if adjacent in permitted and adjacent not in parents:
                    parents[adjacent] = current
                    queue.append(adjacent)
        if target not in parents:
            raise AssertionError(f"No clear route from {start} to {target}")
        path = [target]
        while parents[path[-1]] is not None:
            path.append(parents[path[-1]])
        return path[::-1]

    result["approachNodes"] = {key: route(0, value, True)[-2] for key, value in result["terminalNodes"].items()}
    result["routes"] = {key: route(0, value) for key, value in result["approachNodes"].items()}
    ids = list(result["approachNodes"])
    result["pairRoutes"] = {a + "-" + b: route(result["approachNodes"][a], result["approachNodes"][b])
                            for index, a in enumerate(ids) for b in ids[index + 1:]}
    result["sourceAssets"] = {name: hashlib.sha256((ROOT / "public/models" / name).read_bytes()).hexdigest()
                              for name in ["cyberpunk_compressed.glb", "colider.glb", "quadra.glb"]}
    result["method"] = {"gridSpacing": 2, "surveyDelta": 1 / 30, "endpointTolerance": 0.18,
                        "clearanceRadius": 1.1, "height": 2.5, "materialSides": "preserve GLB doubleSided",
                        "selection": "seed farthest from spawn; greedy maximum minimum walking-graph distance to selected terminals only",
                        "routeFilter": "clearance candidates plus spawn; exclude all kiosk centers from transit"}
    return result

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cafile", required=True)
    parser.add_argument("--output", default="/tmp/phase-3-survey.json")
    args = parser.parse_args()
    pub = subprocess.check_output(["openssl", "x509", "-in", args.cafile, "-pubkey", "-noout"])
    der = subprocess.run(["openssl", "pkey", "-pubin", "-outform", "der"], input=pub, capture_output=True, check=True).stdout
    spki = base64.b64encode(hashlib.sha256(der).digest()).decode()
    helper = runpy.run_path(str(ROOT / "scripts/browser-phase-1.py"))
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox", "--ignore-certificate-errors-spki-list=" + spki])
        context, page, errors = helper["open_harness"](browser, "https://127.0.0.1:5173", has_touch=True)
        page.expose_function("surveyProgress", lambda value: print(json.dumps(value), flush=True))
        result = page.evaluate("""async () => {
          const {surveyCity}=await import('/tests/helpers/surveyCity.js');
          return surveyCity(app, window.surveyProgress);
        }""")
        if errors:
            raise AssertionError(errors)
        result = finalize_survey(result)
        Path(args.output).write_text(json.dumps(result, separators=(",", ":")) + "\n", encoding="utf-8")
        print(json.dumps({"nodes": len(result["nodes"]), "candidates": len(result["candidates"]),
                          "selected": [result["nodes"][i]["position"] for i in result["selected"]]}), flush=True)
        context.close()
        browser.close()

if __name__ == "__main__":
    main()
