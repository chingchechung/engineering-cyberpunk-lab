#!/usr/bin/env python3
"""Check real Unicode Canvas rasterization, font coverage and GPU instance data.

No hardware WebGPU/Windows visual acceptance is implied by this test.
"""
import argparse
import base64
import hashlib
import json
from pathlib import Path
import subprocess
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--cafile',required=True)
parser.add_argument('--origin',default='https://127.0.0.1:5173')
parser.add_argument('--output',default='/tmp/matrix-text')
args=parser.parse_args()
pub=subprocess.check_output(['openssl','x509','-in',args.cafile,'-pubkey','-noout'])
der=subprocess.run(['openssl','pkey','-pubin','-outform','der'],input=pub,capture_output=True,check=True).stdout
spki=base64.b64encode(hashlib.sha256(der).digest()).decode()
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--ignore-certificate-errors-spki-list='+spki])
    context=browser.new_context(viewport={'width':1280,'height':900},has_touch=True)
    page=context.new_page();errors=[];fonts=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('response',lambda r:fonts.append({'url':r.url,'status':r.status}) if 'lab-matrix-text' in r.url and r.url.endswith('.woff2') else None)
    page.goto(args.origin+'/tests/harness.html');page.wait_for_function('window.harness');page.evaluate('harness.setup()')
    result=page.evaluate("""async () => {
      const {verifyMatrixText}=await import('/tests/helpers/verifyMatrixText.js');return verifyMatrixText(app);
    }""")
    atlas=page.evaluate('app.world.matrix.atlas.image.toDataURL()')
    Path(args.output+'-atlas.png').write_bytes(base64.b64decode(atlas.split(',',1)[1]))
    assert not errors,errors
    assert len(fonts)==1 and fonts[0]['status']==200,fonts
    result['fontRequests']=1
    context.close()
    # A failed local font must reject before any world/collider mutation, never
    # silently fall back to tofu/system fonts and mark initialization complete.
    context=browser.new_context();context.route('**/lab-matrix-text.woff2',lambda route:route.abort())
    page=context.new_page();page.goto(args.origin+'/tests/harness.html');page.wait_for_function('window.harness')
    failed=page.evaluate("""async () => {
      const {createMatrixExtension}=await import('/src/world/matrix/createMatrixExtension.js');
      const scene=new harness.THREE.Scene(),bounds=new harness.THREE.Group(),colliders=[bounds];
      try {await createMatrixExtension({scene,boundsCollider:bounds,colliders});return false;}
      catch {return scene.children.length===0&&colliders.length===1;}
    }""")
    assert failed,'Font failure silently fell back or mutated world'
    result['blockedFontRejectsCleanly']=True
    Path(args.output+'.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print('PASS multilingual Unicode rasterization, coverage, cell mapping/padding, single local load, seeded distribution and stable bounded animation:',json.dumps({k:v for k,v in result.items() if k!='cells'}))
    context.close();browser.close()
