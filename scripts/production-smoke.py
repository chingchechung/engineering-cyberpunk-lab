#!/usr/bin/env python3
"""Build and serve root/course/UserDir variants on real private localhost Apache.

Uses actual dist files, not Vite preview/dev. Leaves only local test evidence.
"""
import argparse,hashlib,json,os,re,shutil,subprocess,tempfile
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import Request,urlopen
from playwright.sync_api import sync_playwright
from artifact_checks import ROOT,verify_dist
from apache_test_host import apache_host

BASES={'root':'/','nested':'/course/cyberpunk-lab/','userdir':'/~username/cyberpunk-lab/'}
MIMES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.glb':'model/gltf-binary','.hdr':'image/vnd.radiance','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.mp3':'audio/mpeg','.mp4':'video/mp4','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'}
p=argparse.ArgumentParser();p.add_argument('--output',default='/tmp/phase4-static-results.json');p.add_argument('--allow-software-device-loss',action='store_true');a=p.parse_args()
work=Path(tempfile.mkdtemp(prefix='engineering-lab-static-'));www=work/'www';www.mkdir()
print('Private static test workspace:',work,flush=True)
assert subprocess.check_output(['node','--version'],text=True, encoding="utf-8").strip()=='v22.23.4','Use pinned Node'
results={'variants':{},'workDirectory':str(work),'webgpuVisualAcceptance':False}
for name,base in BASES.items():
    out=work/'builds'/name
    with open(work/(name+'-build.log'),'w', encoding="utf-8") as log:subprocess.run(['npm','run','build','--','--base='+base,'--outDir='+str(out)],cwd=ROOT,check=True,stdout=log,stderr=log)
    integrity=verify_dist(out,base);results['variants'][name]={'base':base,'integrity':{k:v for k,v in integrity.items() if k!='inventory'}}
    target=www/base.lstrip('/');shutil.copytree(out,target,dirs_exist_ok=True)
with apache_host(www,work/'apache') as host:
    results['server']=host['version']
    for name,base in BASES.items():
        dist=work/'builds'/name;count=0
        for path in sorted(dist.rglob('*')):
            if not path.is_file() or path.name.startswith('.'):continue
            relative=path.relative_to(dist).as_posix()
            with urlopen(host['origin']+base+relative,context=host['context']) as r:
                payload=r.read();assert hashlib.sha256(payload).digest()==hashlib.sha256(path.read_bytes()).digest(),relative
                if path.suffix in MIMES:assert r.headers.get_content_type()==MIMES[path.suffix],(relative,r.headers)
                assert r.headers['X-Content-Type-Options']=='nosniff'
                if path.suffix in ['.html','.json']:assert r.headers['Cache-Control']=='no-store'
                if relative.startswith('assets/') and re.search(r'-[A-Za-z0-9_-]{8,}\.',relative):assert 'immutable' in r.headers['Cache-Control']
            count+=1
        if base!='/':
            with urlopen(host['origin']+base.rstrip('/'),context=host['context']) as r:assert r.url==host['origin']+base
        for hidden in [p.relative_to(dist).as_posix() for p in dist.rglob('.gitkeep')]:
            try:urlopen(host['origin']+base+hidden,context=host['context']);raise AssertionError('Dotfile exposed')
            except HTTPError as e:assert e.code==403
        for missing in ['missing.json','models/missing.glb','assets/missing.js']:
            try:urlopen(host['origin']+base+missing,context=host['context']);raise AssertionError('Missing resource did not fail')
            except HTTPError as e:assert e.code==404 and b'<title>Engineering Cyberpunk Lab</title>' not in e.read()
        req=Request(host['origin']+base+'video/imagine-art-feed-item.mp4',headers={'Range':'bytes=0-15'})
        with urlopen(req,context=host['context']) as r:assert r.status==206 and len(r.read())==16 and r.headers['Content-Range'].startswith('bytes 0-15/')
        results['variants'][name]['staticHttp']={'filesVerified':count,'mimeCacheHashes':True,'missing404':True,'mediaRange206':True}
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE','/usr/bin/chromium'),args=['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--ignore-certificate-errors-spki-list='+host['spki']])
        for name,base in BASES.items():
            context=browser.new_context(viewport={'width':1280,'height':900});page=context.new_page();errors=[];network=[];failures=[];console=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.on('console',lambda m:console.append(m.text) if m.type=='error' else None)
            page.on('response',lambda r:network.append({'path':urlsplit(r.url).path,'url':r.url,'status':r.status,'mime':r.headers.get('content-type','')}))
            page.on('requestfailed',lambda r:failures.append({'url':r.url,'reason':r.failure}))
            context.route(re.compile(r'https://(?:(?:www\.)?youtube\.com|youtu\.be|forms\.gle|docs\.google\.com)/'),lambda route:route.fulfill(content_type='text/html',body='Intercepted fixture destination'))
            page.goto(host['origin']+base,wait_until='domcontentloaded')
            page.get_by_role('button',name='ENTER',exact=True).click(timeout=60000)
            hud=page.locator('.education-hud');hud.wait_for(state='visible')
            assert '0/5' in hud.inner_text() and 'DEMO MODE' in hud.inner_text()
            assert page.evaluate('isSecureContext && document.fonts.check(\'56px "Lab Matrix Text"\',"A0アイあ가나")')
            selector=page.locator('.education-selector')
            def open_selector():
                page.get_by_role('button',name='Assignments',exact=True).click()
                page.wait_for_function("!document.querySelector('.education-selector [data-status]').textContent.includes('Reading')")
            open_selector();assert 'Demo Mode' in selector.locator('[data-status]').inner_text();page.keyboard.press('Escape')
            units=[json.loads((ROOT/'tests/fixtures/S01.json').read_text(encoding="utf-8")),json.loads((ROOT/'tests/fixtures/v2/S02.json').read_text(encoding="utf-8"))]
            assert [len(u['questions']) for u in units]==[4,5]
            assignments=www/base.lstrip('/')/'assignments'
            for unit in units:(assignments/(unit['unitId']+'.json')).write_text(json.dumps(unit), encoding="utf-8")
            manifest={'schemaVersion':1,'units':[{'unitId':u['unitId'],'title':u['title'],'file':u['unitId']+'.json'} for u in units]}
            (assignments/'manifest.json.tmp').write_text(json.dumps(manifest), encoding="utf-8");(assignments/'manifest.json.tmp').replace(assignments/'manifest.json')
            for unit in units:
                open_selector();selector.locator('select').select_option(unit['unitId']);selector.get_by_role('button',name='Load unit',exact=True).click();selector.get_by_role('button',name='Replace and load').click();selector.wait_for(state='hidden')
                assert f"0/{len(unit['questions'])}" in hud.inner_text() and unit['unitId'] in hud.inner_text()
            # Unlisted S03 is never requested; failed replacement preserves S02.
            (assignments/'S01.json').write_text('{', encoding="utf-8")
            open_selector();selector.locator('select').select_option('S01');selector.get_by_role('button',name='Load unit',exact=True).click();selector.get_by_role('button',name='Replace and load').click()
            page.wait_for_function("!document.querySelector('.education-selector [data-status]').textContent.includes('Loading')")
            assert selector.is_visible() and 'S02' in hud.inner_text() and '0/5' in hud.inner_text();page.keyboard.press('Escape')
            calls=[n['path'] for n in network if '/assignments/' in n['path']]
            assert all(path.rsplit('/',1)[-1] in ['manifest.json','S01.json','S02.json'] for path in calls)
            page.wait_for_timeout(200)
            unexpected=[e for e in errors+console if not any(k in e for k in ['Instance dropped in popErrorScope','WebGPU Device Lost','A valid external Instance reference no longer exists'])]
            known=bool(errors or console)
            assert not unexpected,unexpected[:5]
            assert not known or a.allow_software_device_loss,'WebGPU failure: run with explicit cloud diagnostic waiver only for known software-device loss'
            # The accepted audio button replaces/pauses native media preload
            # requests. Chromium may cancel those with ERR_ABORTED; the media
            # files are independently hash/MIME checked above. Other failures fail.
            preload_paths={base+name for name in ['light-rain.mp3','night-ambience.mp3','thunderstorm.mp3']} | {base+p.relative_to(dist).as_posix() for p in (dist/'video').glob('*.mp4')}
            preload_aborts=[f for f in failures if f['reason']=='net::ERR_ABORTED' and urlsplit(f['url']).path in preload_paths]
            assert not [f for f in failures if f not in preload_aborts],failures
            for n in network:
                assert n['url'].startswith(host['origin']+'/') and n['path'].startswith(base),f'Resource escaped application base: {n}'
                assert n['status'] in [200,206],n
            results['variants'][name]['browser']={'assignmentVersions':[1,2],'questionTotals':[4,5],'failedReplacementPreserved':True,'manifestFirstEmpty':True,'fontLoaded':True,'worldInitializationReachedHud':True,'knownSoftwareDeviceLoss':known,'unexpectedErrors':unexpected,'nativeMediaPreloadAborts':preload_aborts,'network':network,'assignmentRequests':calls}
            print('PASS static Apache',name,base,'network resources',len(network),'known software GPU loss',known,flush=True)
            context.close()
        browser.close()
Path(a.output).write_text(json.dumps(results,indent=2)+'\n', encoding="utf-8")
print('PASS root/nested/UserDir built static hosting; hardware visual acceptance remains separate. Results:',a.output)
