#!/usr/bin/env python3
"""Real DOM/input and decoded-GLB checks, independent of WebGPU rendering.

Requires Python Playwright and system Chromium. Start the normal HTTPS Vite dev
server first. Only the supplied local certificate's public key is trusted.
"""
import argparse
import base64
import hashlib
import json
import subprocess
from pathlib import Path

from playwright.sync_api import sync_playwright


def check(condition, message):
    if not condition:
        raise AssertionError(message)


def open_harness(browser, origin, **options):
    context = browser.new_context(viewport={"width": 1280, "height": 900}, **options)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(origin + "/tests/harness.html")
    page.wait_for_function("window.harness")
    page.evaluate("harness.setup()")
    check(not errors, f"Harness initialization errors: {errors}")
    return context, page, errors


def geometry_checks(browser, origin):
    context, page, errors = open_harness(browser, origin, has_touch=True)
    result = page.evaluate("""() => {
      const {THREE, TERMINAL_LAYOUT, findNearbyTerminal} = harness;
      const {camera, director, world, geometry, education} = app;
      const walk = director.walkControls;
      const ray = new THREE.Raycaster();
      for (const terminal of TERMINAL_LAYOUT) {
        const [x,y,z] = terminal.position;
        for (const height of [0.3, 1, 1.8, 2.3]) {
          for (let a=0; a<Math.PI*2; a+=Math.PI/8) {
            ray.set(new THREE.Vector3(x,y+height,z), new THREE.Vector3(Math.cos(a),0,Math.sin(a)));
            ray.far = 1.05;
            if (ray.intersectObjects(geometry.colliders.slice(0,3),true).length) throw Error(terminal.id+' has blocked clearance');
          }
        }
        ray.set(new THREE.Vector3(x,y+0.05,z), new THREE.Vector3(0,1,0)); ray.far=2.4;
        if(ray.intersectObjects(geometry.colliders.slice(0,3),true).length) throw Error(terminal.id+' intersects overhead geometry');
      }
      const route = [[-137,32],[-136,30.8],[-133,28],[-130,28.8],[-123,28.8],[-116,31.8],[-111,35.8]];
      const visited = new Set();
      for (const [x,z] of route) {
        let frames=0;
        while(Math.hypot(camera.position.x-x,camera.position.z-z)>0.12 && frames++<1200) {
          camera.lookAt(x,camera.position.y,z);walk.syncEulerFromCamera();
          walk.setMoveAxes(0,-Math.min(1,Math.hypot(camera.position.x-x,camera.position.z-z)));
          director.update(1/60);
          const nearby=findNearbyTerminal(camera.position);if(nearby)visited.add(nearby.id);
        }
        walk.clearInput();
        if(frames>=1200)throw Error('Route blocked at '+[x,z]+' from '+camera.position.toArray());
        education.update();
      }
      if(visited.size!==5)throw Error('Unreachable terminals: '+[...visited]);
      const entries=education.terminals.entries;
      if(entries.some(t=>t.label.name!==t.id+'-label'||t.indicator.material.color.getHex()!==0xffdf24))throw Error('Missing labels/indicators');
      // Drive at the actual car's conservative blocker with the unchanged wall rays.
      camera.position.set(-133,-3.85,33);camera.lookAt(-120,-3.85,33);walk.syncEulerFromCamera();
      for(let i=0;i<180;i++){walk.setMoveAxes(0,-1);director.update(1/60);}
      if(camera.position.x > geometry.carBox.min.x - 0.5)throw Error('Car collision failed');
      return {visited:[...visited],clearance:'1.05 m radial / 2.4 m high',carStopX:camera.position.x};
    }""")
    check(not errors, f"Geometry test errors: {errors}")
    context.close()
    print("PASS actual GLB clearance, five-terminal walking route, labels/indicators, car collision:", json.dumps(result))


def modal_checks(browser, origin):
    context, page, errors = open_harness(browser, origin)
    page.wait_for_function("document.querySelector('.app-header').getBoundingClientRect().top >= -0.1")
    page.evaluate("""() => {
      app.camera.position.set(-136,-3.85,30.8);app.director.walkControls.syncEulerFromCamera();app.education.update();
      window.backgroundClicks=0;window.backgroundKeys=0;window.backgroundOpens=0;
      window.open=()=>backgroundOpens++;
      window.backgroundRects=[...document.querySelectorAll('.app-header button, .audio-btn, .walk-controls__chip')].map(e=>{
        const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};
      });
      document.querySelector('#background').addEventListener('click',()=>backgroundClicks++);
      window.addEventListener('keydown',()=>backgroundKeys++);
    }""")
    # Real pointer lock via a user gesture. The first synthetic delta must be ignored.
    page.locator(".walk-prompt").click()
    page.wait_for_function("document.pointerLockElement === app.canvas")
    page.evaluate("""() => {
      window.beforeLockMove=app.camera.quaternion.clone();
      window.dispatchEvent(new MouseEvent('mousemove',{movementX:140,movementY:-140}));
      if(app.camera.quaternion.angleTo(beforeLockMove)>1e-7)throw Error('First lock event jumped');
    }""")
    page.wait_for_timeout(110)
    page.evaluate("""() => {
      window.dispatchEvent(new MouseEvent('mousemove',{movementX:10,movementY:5}));
      if(app.camera.quaternion.angleTo(beforeLockMove)<0.01)throw Error('Normal mouse movement ignored');
      window.stableRotation=app.camera.quaternion.clone();
      window.dispatchEvent(new MouseEvent('mousemove',{movementX:0,movementY:-10000}));
      for(let i=0;i<120;i++)app.director.update(1/60);
      if(app.camera.quaternion.angleTo(stableRotation)>1e-7)throw Error('Spurious or idle drift');
    }""")
    page.keyboard.press("p")
    check(page.evaluate("app.director.walkControls.isHorizontalOnly()"), "P did not enable horizontal mode")
    page.evaluate("window.dispatchEvent(new MouseEvent('mousemove',{movementX:4,movementY:-30}))")
    check(page.evaluate("Math.abs(new harness.THREE.Euler().setFromQuaternion(app.camera.quaternion,'YXZ').x)<1e-8"), "Horizontal look changed pitch")
    page.keyboard.press("p")
    page.keyboard.press("r")
    page.keyboard.down("w")
    page.keyboard.press("x")
    quiz = page.locator("dialog.education-quiz:not(.education-selector)")
    check(quiz.is_visible(), "X did not open nearby Q01")
    check(page.evaluate("document.pointerLockElement === null && app.director.isInputSuspended()"), "Modal did not release lock/suspend input")
    page.keyboard.up("w")
    check(page.evaluate("[...document.body.children].every(e=>e===app.education.modal.dialog||e.inert)"), "Background is not inert")
    key_count = page.evaluate("backgroundKeys")
    for code in ["w", "p", "r", "x"]:
        page.keyboard.press(code)
    check(page.evaluate("backgroundKeys") == key_count, "Modal keyboard leaked to background")
    # Physical click over a background button, then a programmatic click dispatch.
    page.mouse.click(30, 30)
    page.evaluate("document.querySelector('#background').dispatchEvent(new MouseEvent('click',{bubbles:true}))")
    check(page.evaluate("backgroundClicks") == 0, "Background click-through")
    page.evaluate("""() => {
      const position=app.camera.position.clone(),rotation=app.camera.quaternion.clone();
      app.director.walkControls.setMoveAxes(1,1);
      app.director.walkControls.applyLookDelta(10,-20);
      for(let i=0;i<60;i++)app.director.update(1/60);
      if(!app.camera.position.equals(position)||app.camera.quaternion.angleTo(rotation)>1e-7)throw Error('Modal moved player');
      const late=document.createElement('button');late.id='late-background';late.textContent='Late UI';document.body.append(late);
    }""")
    page.wait_for_function("document.querySelector('#late-background').inert")
    for _ in range(12):
        page.keyboard.press("Tab")
        check(page.evaluate("app.education.modal.dialog.contains(document.activeElement)"), "Tab escaped quiz")
    page.keyboard.press("Shift+Tab")
    check(page.evaluate("app.education.modal.dialog.contains(document.activeElement)"), "Reverse Tab escaped quiz")
    page.evaluate("document.querySelector('#background').focus()")
    check(page.evaluate("app.education.modal.dialog.contains(document.activeElement)"), "Programmatic focus escaped quiz")
    # Actual original header button coordinates must also be blocked.
    page.evaluate("window.panelBefore=app.shell.uiState.openedPanel")
    for point in page.evaluate("backgroundRects"):
        page.mouse.click(point["x"], point["y"])
    page.evaluate("document.querySelector('.app-header-settings-btn').dispatchEvent(new MouseEvent('click',{bubbles:true}))")
    check(page.evaluate("app.shell.uiState.openedPanel === 'quiz'"), "Underlying original UI changed quiz state")
    check(page.evaluate("backgroundOpens") == 0, "Background source button opened a tab")
    quiz.locator('input[value="1"]').check()
    quiz.get_by_role("button", name="Check answer").click()
    check("Incorrect" in quiz.locator("[data-feedback]").inner_text(), "Wrong-answer feedback missing")
    quiz.get_by_role("button", name="Try again").click()
    quiz.locator('input[value="0"]').check()
    quiz.get_by_role("button", name="Check answer").click()
    check(page.evaluate("app.education.progress.getCompleted()") == 1, "Correct answer did not advance progress")
    quiz.get_by_role("button", name="Close question").click()
    check(not quiz.is_visible(), "Close button failed")
    check(page.evaluate("!app.director.isInputSuspended() && document.pointerLockElement === null"), "Close auto-locked or stayed suspended")
    check(page.evaluate("[app.canvas,document.querySelector('.education-prompt'),document.querySelector('.walk-prompt')].includes(document.activeElement)"), "Focus did not return")
    page.evaluate("""() => {
      const before=app.camera.position.clone();for(let i=0;i<60;i++)app.director.update(1/60);
      if(!app.camera.position.equals(before))throw Error('Held movement replayed on close');
    }""")
    # Repeat using X and both close methods. Passed state survives reopening.
    for index in range(8):
        page.keyboard.press("x")
        check(quiz.is_visible(), f"Repeated open {index} failed")
        check("passed" in quiz.locator("[data-feedback]").inner_text(), "Passed state lost")
        if index % 2:
            quiz.get_by_role("button", name="Close question").click()
        else:
            page.keyboard.press("Escape")
        check(not quiz.is_visible(), f"Repeated close {index} failed")
    page.locator(".walk-prompt").click()
    page.wait_for_function("document.pointerLockElement === app.canvas")
    page.evaluate("""() => {
      const position=app.camera.position.clone(),rotation=app.camera.quaternion.clone();
      window.dispatchEvent(new MouseEvent('mousemove',{movementX:120,movementY:-120}));
      for(let i=0;i<60;i++)app.director.update(1/60);
      if(!app.camera.position.equals(position)||app.camera.quaternion.angleTo(rotation)>1e-7)throw Error('Relock replayed input');
      app.director.walkControls.exitPointerLock();
    }""")
    # The original buttons must recover after the modal, not remain inert.
    page.locator("#background").click()
    check(page.evaluate("backgroundClicks") == 1, "Background did not recover")
    for index in range(1, 5):
        answer = page.evaluate("""index => {
          const q=app.education.progress.questions[index];
          const [x,y,z]=harness.TERMINAL_LAYOUT[index].position;
          app.camera.position.set(x,y+1.55,z+1.8);app.education.update();
          return q.answer;
        }""", index)
        page.keyboard.press("x")
        check(quiz.locator("h2").inner_text() == f"Q0{index+1}", "Wrong terminal question")
        quiz.locator(f'input[value="{answer}"]').check()
        quiz.get_by_role("button", name="Check answer").click()
        quiz.get_by_role("button", name="Close question").click()
    check(page.locator("[data-progress]").inner_text() == "5/5 questions passed", "Five-question progress did not render")
    page.evaluate("app.camera.position.set(0,50,0);app.education.update()")
    page.keyboard.press("x")
    check(not quiz.is_visible(), "Distant terminal opened")
    # Mode ownership and pitch synchronization, including orbit's damping state.
    page.evaluate("""() => {
      const {director,camera}=app;
      camera.position.set(-138,-3.85,34);camera.lookAt(-120,-3.85,30);director.walkControls.syncEulerFromCamera();
      director.setCameraMode('orbit');
      director.controls.rotateLeft(0.1);director.controls.rotateUp(0.1);director.update(1/60);
      director.setCameraMode('walk');
      const pose=camera.quaternion.clone();
      for(let i=0;i<120;i++)director.update(1/60);
      if(camera.quaternion.angleTo(pose)>1e-7)throw Error('Orbit/walk idle drift');
      if(director.controls.enabled)throw Error('Orbit still owns walking camera');
      director.setCameraMode('orbit');
      const orbitPose=camera.quaternion.clone();
      for(let i=0;i<120;i++)director.update(1/60);
      if(camera.quaternion.angleTo(orbitPose)>1e-7)throw Error('Old orbit damping replayed');
    }""")
    check(not errors, f"UI test errors: {errors}")
    context.close()
    print("PASS real Pointer Lock/relock, filtered look/R/P, X/radius, modal click/keyboard/focus isolation, retry and 5/5 progress, 13 open/close cycles, orbit/walk damping")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--origin", default="https://127.0.0.1:5173")
    parser.add_argument("--cafile", type=Path, required=True)
    parser.add_argument("--chromium", default="/usr/bin/chromium")
    args = parser.parse_args()
    public_key = subprocess.check_output(["openssl", "x509", "-in", str(args.cafile), "-pubkey", "-noout"])
    der = subprocess.run(["openssl", "pkey", "-pubin", "-outform", "der"], input=public_key, check=True, capture_output=True).stdout
    spki = base64.b64encode(hashlib.sha256(der).digest()).decode()
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=args.chromium, headless=True, args=["--no-sandbox", "--ignore-certificate-errors-spki-list=" + spki])
        geometry_checks(browser, args.origin)
        modal_checks(browser, args.origin)
        browser.close()


if __name__ == "__main__":
    main()
