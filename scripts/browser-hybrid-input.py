#!/usr/bin/env python3
"""Native Pointer Lock and emulated touch/capture tests; no hardware acceptance claim."""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import runpy
import subprocess

from playwright.sync_api import sync_playwright
from pointer_lock_diagnostics import observe_pointer_lock, prepare_pointer_lock_gesture, wait_for_pointer_lock

ROOT = Path(__file__).resolve().parents[1]
phase1 = runpy.run_path(str(ROOT/'scripts/browser-phase-1.py'))
phase3 = runpy.run_path(str(ROOT/'scripts/browser-phase-3.py'))
check = phase1['check']
CASES = [
    {'name':'confirmed Windows laptop','coarse':False,'fine':True,'points':10,'width':1092,'height':900},
    {'name':'coarse + fine hybrid','coarse':True,'fine':True,'points':10,'width':1092,'height':900},
    {'name':'touch-only phone','coarse':True,'fine':False,'points':5,'width':390,'height':844},
    {'name':'touch-only tablet','coarse':True,'fine':False,'points':10,'width':1024,'height':768},
]


class CapabilityBrowser:
    def __init__(self, browser, capabilities):
        self.browser, self.capabilities = browser, capabilities

    def new_context(self, **options):
        cap = self.capabilities
        options.update(has_touch=True, viewport={'width':cap['width'],'height':cap['height']})
        context = self.browser.new_context(**options)
        context.add_init_script("""(() => {
          const cap = CAPABILITIES;
          Object.defineProperty(navigator,'maxTouchPoints',{configurable:true,get:()=>cap.points});
          const original = matchMedia.bind(window);
          const queries = {'(pointer: coarse)':cap.coarse,'(pointer: fine)':!cap.coarse&&cap.fine,
            '(any-pointer: fine)':cap.fine,'(any-pointer: coarse)':true};
          window.matchMedia = query => {
            const media = original(query);
            if(query in queries)Object.defineProperty(media,'matches',{get:()=>queries[query]});
            return media;
          };
        })()""".replace('CAPABILITIES', json.dumps(cap)))
        return context


def exercise(browser, origin, cap):
    context, page, errors = phase1['open_harness'](CapabilityBrowser(browser, cap), origin)
    observe_pointer_lock(page)
    diagnostics = page.evaluate("""({primaryCoarse:matchMedia('(pointer: coarse)').matches,
      anyFine:matchMedia('(any-pointer: fine)').matches,maxTouchPoints:navigator.maxTouchPoints,
      innerWidth, pointerLockSupported:'pointerLockElement' in document,
      oldClassification:matchMedia('(pointer: coarse)').matches||navigator.maxTouchPoints>0})""")
    check(diagnostics['maxTouchPoints'] == cap['points'] and diagnostics['anyFine'] == cap['fine'], 'Capability fixture mismatch')
    if cap['name'] == 'confirmed Windows laptop':
        check(diagnostics == {'primaryCoarse':False,'anyFine':True,'maxTouchPoints':10,
              'innerWidth':1092,'pointerLockSupported':True,'oldClassification':True}, 'Exact instructor diagnostics changed')
    joystick = page.locator('.virtual-joystick')
    prompt = page.locator('.walk-prompt')
    expected = 'mouse' if cap['fine'] else 'touch'
    check(page.evaluate('app.director.walkControls.getInputMethod()') == expected, 'Wrong initial input/UI mode')
    check(joystick.is_visible() != cap['fine'], 'Wrong initial joystick visibility')
    check(page.locator('.walk-controls').evaluate("e=>e.classList.contains('walk-controls--hidden')") != cap['fine'], 'Wrong initial control hints')
    check(('Click to resume' if cap['fine'] else 'Drag to look') in prompt.text_content(), 'Wrong prompt')
    page.evaluate("""() => {
      window.pointerIds={};window.captureLog=[];
      for(const [name,element] of [['canvas',app.canvas],['joystick',document.querySelector('.virtual-joystick')]]) {
        element.addEventListener('pointerdown',event=>pointerIds[name]=event.pointerId,true);
        for(const type of ['pointerdown','pointermove','pointerup','pointercancel','gotpointercapture','lostpointercapture'])
          element.addEventListener(type,event=>captureLog.push({type,element:name,id:event.pointerId,
            pointerType:event.pointerType,x:event.clientX,y:event.clientY,method:app.director.walkControls.getInputMethod()}),true);
      }
    }""")
    if cap['fine']:
        prompt.click()
        wait_for_pointer_lock(page, cap['name']+' initial trusted click')
        survey = json.loads((ROOT/'tests/fixtures/terminal-survey.json').read_text(encoding='utf-8'))
        start = survey['start']
        target = next(survey['nodes'][i]['position'] for i in survey['routes']['Q01']
                      if sum((survey['nodes'][i]['position'][j]-start[j])**2 for j in [0,2]) > 2)
        page.evaluate("""({start,target})=>{
          app.camera.position.fromArray(start);app.camera.lookAt(...target);
          app.director.walkControls.syncEulerFromCamera();window.startPosition=app.camera.position.clone();
        }""", {'start':start,'target':target})
        page.keyboard.down('w')
        page.evaluate('for(let i=0;i<20;i++)app.director.update(1/60)')
        check(page.evaluate('app.camera.position.distanceTo(startPosition)>.1'), 'Keyboard movement requires a previous touch')
        page.keyboard.down('Shift'); page.keyboard.up('Shift'); page.keyboard.up('w')
        page.keyboard.press('c'); check(page.evaluate('app.director.walkControls.isCrouched()'), 'Crouch unavailable')
        page.keyboard.press('c'); page.keyboard.press('p')
        check(page.evaluate('app.director.walkControls.isHorizontalOnly()'), 'P unavailable')
        page.keyboard.press('p'); page.keyboard.press('r')
        page.keyboard.down('w')  # Must be discarded by the mouse -> touch handoff.

    cdp = context.new_cdp_session(page)
    def touch(kind, points):
        cdp.send('Input.dispatchTouchEvent', {'type':kind, 'touchPoints':[
            {'id':i,'x':x,'y':y,'radiusX':1,'radiusY':1,'force':1} for i,x,y in points]})
    x,y = cap['width']*.7, cap['height']*.45
    touch('touchStart', [(1,x,y)])
    page.wait_for_function("app.director.walkControls.getInputMethod()==='touch' && document.pointerLockElement===null")
    check(joystick.is_visible(), 'Actual touch did not enable joystick UI')
    check(page.locator('.walk-controls').evaluate("e=>e.classList.contains('walk-controls--hidden')"), 'Desktop hints overlap touch controls')
    page.evaluate('window.touchStartRotation=app.camera.quaternion.clone();window.touchStartPosition=app.camera.position.clone()')
    if cap['fine']:
        page.wait_for_function("pointerLockDiagnostics().events.some(e=>e.type==='pointerlockchange'&&!e.locked)")
    touch('touchMove', [(1,x+14,y+5)])
    if cap['fine']:
        check(page.evaluate('app.camera.quaternion.angleTo(touchStartRotation)<1e-7'), 'Native touch handoff applied recentered coordinates')
        touch('touchMove', [(1,x+28,y+10)])
    if not page.evaluate('app.camera.quaternion.angleTo(touchStartRotation)>.005 && app.director.walkControls.hasTouchLooked()'):
        raise AssertionError(page.evaluate('({captureLog,locks:pointerLockDiagnostics(),method:app.director.walkControls.getInputMethod(),looked:app.director.walkControls.hasTouchLooked()})'))
    page.evaluate('for(let i=0;i<60;i++)app.director.update(1/60)')
    check(page.evaluate('app.camera.position.distanceTo(touchStartPosition)<1e-7'), 'Held keyboard replayed after touch handoff')
    if cap['fine']: page.keyboard.up('w')
    rect = joystick.bounding_box(); jx,jy = rect['x']+rect['width']/2, rect['y']+rect['height']/2
    touch('touchStart', [(1,x+14,y+5),(2,jx,jy)])
    touch('touchMove', [(1,x+20,y+7),(2,jx,jy-42)])
    page.wait_for_function("jy=>captureLog.some(e=>e.element==='joystick'&&e.type==='pointermove'&&e.id===pointerIds.joystick&&e.y<jy-20)",arg=jy)
    page.evaluate('for(let i=0;i<20;i++)app.director.update(1/60)')
    if not page.evaluate('app.director.walkControls.getHorizontalSpeed()>.05'):
        raise AssertionError(page.evaluate("""({captureLog,method:app.director.walkControls.getInputMethod(),
          position:app.camera.position.toArray(),suspended:app.director.isInputSuspended(),
          hit:document.elementFromPoint(80,innerHeight-84)?.outerHTML.slice(0,300)})"""))
    touch('touchEnd', [])
    page.wait_for_function("!app.canvas.hasPointerCapture(pointerIds.canvas)&&!document.querySelector('.virtual-joystick').hasPointerCapture(pointerIds.joystick)")
    page.evaluate('for(let i=0;i<180;i++)app.director.update(1/60)')
    check(page.evaluate("""app.director.walkControls.getHorizontalSpeed()<.01 &&
      !app.canvas.hasPointerCapture(pointerIds.canvas) &&
      !document.querySelector('.virtual-joystick').hasPointerCapture(pointerIds.joystick)"""), 'Touch release left input/capture stuck')

    # Overlay transitions must cancel a still-held joystick capture, not replay it.
    phase3['near'](page, 'Q01')
    touch('touchStart', [(3,jx,jy)])
    touch('touchMove', [(3,jx,jy-40)])
    page.wait_for_function("jy=>captureLog.some(e=>e.element==='joystick'&&e.type==='pointermove'&&e.id===pointerIds.joystick&&e.y<jy-20)",arg=jy)
    page.keyboard.press('x')
    quiz = page.locator('.education-quiz:not(.education-selector)'); quiz.wait_for(state='visible')
    page.evaluate('window.modalPosition=app.camera.position.clone();window.modalRotation=app.camera.quaternion.clone()')
    check(joystick.is_hidden() and page.evaluate("!document.querySelector('.virtual-joystick').hasPointerCapture(pointerIds.joystick)"), 'Modal retained joystick capture/UI')
    touch('touchMove', [(3,jx+30,jy-50)]); touch('touchEnd', [])
    page.keyboard.press('Escape')
    page.evaluate('for(let i=0;i<180;i++)app.director.update(1/60)')
    check(page.evaluate('app.camera.position.distanceTo(modalPosition)<1e-7 && app.camera.quaternion.angleTo(modalRotation)<1e-7 && document.pointerLockElement===null'), 'Overlay close replayed touch/movement or forced lock')

    if cap['fine']:
        page.mouse.move(x,y); page.mouse.move(x+25,y)
        page.wait_for_function("app.director.walkControls.getInputMethod()==='mouse'")
        check(joystick.is_hidden() and 'Click to resume' in prompt.text_content(), 'Touch -> mouse did not restore desktop UI')
        check(not page.locator('.walk-controls').evaluate("e=>e.classList.contains('walk-controls--hidden')"), 'Desktop control hints did not return')
        prepare_pointer_lock_gesture(page); prompt.click(); wait_for_pointer_lock(page, cap['name']+' after touch')
        page.evaluate("window.beforeRelock=app.camera.quaternion.clone();window.dispatchEvent(new MouseEvent('mousemove',{movementX:130,movementY:-130}))")
        check(page.evaluate('app.camera.quaternion.angleTo(beforeRelock)<1e-7'), 'Relock jumped after touch')
        page.wait_for_timeout(110)
        page.mouse.move(x+30,y+2); page.mouse.move(x+40,y+4)
        check(page.evaluate('app.camera.quaternion.angleTo(beforeRelock)>.001'), 'Mouse look remains disabled after touch')
    check(not errors, f'Hybrid browser errors: {errors}')
    print('PASS hybrid input:', cap['name'], json.dumps(diagnostics), flush=True)
    context.close()


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--origin',default='https://127.0.0.1:5173'); parser.add_argument('--cafile',required=True)
    args = parser.parse_args()
    pub = subprocess.check_output(['openssl','x509','-in',args.cafile,'-pubkey','-noout'])
    der = subprocess.run(['openssl','pkey','-pubin','-outform','der'],input=pub,capture_output=True,check=True).stdout
    spki = base64.b64encode(hashlib.sha256(der).digest()).decode('ascii')
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE','/usr/bin/chromium'),args=['--no-sandbox','--ignore-certificate-errors-spki-list='+spki])
        for cap in CASES: exercise(browser,args.origin,cap)
        # Run every accepted Close & Resume/focus/denial assertion unchanged,
        # including its Chromium 151 pacing, under the exact laptop capabilities.
        phase3['resume_checks'](CapabilityBrowser(browser, CASES[0]), args.origin)
        browser.close()


if __name__ == '__main__': main()
