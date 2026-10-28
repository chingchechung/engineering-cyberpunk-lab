#!/usr/bin/env python3
"""Actual GLB/controller extension tests; independent of rendered GPU acceptance."""
import argparse
import base64
import hashlib
import json
from pathlib import Path
import runpy
import subprocess
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--cafile',required=True)
    parser.add_argument('--origin',default='https://127.0.0.1:5173')
    parser.add_argument('--output',default='/tmp/phase-3-5-metrics.json')
    args=parser.parse_args()
    pub=subprocess.check_output(['openssl','x509','-in',args.cafile,'-pubkey','-noout'])
    der=subprocess.run(['openssl','pkey','-pubin','-outform','der'],input=pub,capture_output=True,check=True).stdout
    spki=base64.b64encode(hashlib.sha256(der).digest()).decode()
    helper=runpy.run_path(str(ROOT/'scripts/browser-phase-1.py'))
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--ignore-certificate-errors-spki-list='+spki])
        context,page,errors=helper['open_harness'](browser,args.origin,has_touch=True)
        result=page.evaluate("""async () => {
          const {verifyMatrixRoutes}=await import('/tests/helpers/verifyMatrixRoutes.js');
          const survey=await (await fetch('/tests/fixtures/terminal-survey.json')).json();
          return verifyMatrixRoutes(app,survey);
        }""")
        if errors:raise AssertionError(errors)
        Path(args.output).write_text(json.dumps(result,indent=2)+'\n')
        print('PASS Matrix original-controller round trips, supported seams/plazas, all exterior edges, retained original walls, look-back geometry, budgets/culling/cleanup:',json.dumps(result))
        context.close();browser.close()

if __name__=='__main__':main()
