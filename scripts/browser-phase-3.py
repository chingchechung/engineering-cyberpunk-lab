#!/usr/bin/env python3
"""Native Phase 3 navigation/resume tests; fixture providers are intercepted.

These use real browser input and the original decoded geometry harness, not a
WebGPU renderer. No requests reach YouTube or Google Forms fixture destinations.
"""
import argparse
import os
import base64
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import runpy
import subprocess
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright, Error
from pointer_lock_diagnostics import observe_pointer_lock, prepare_pointer_lock_gesture, wait_for_pointer_lock

ROOT = Path(__file__).resolve().parents[1]
phase1 = runpy.run_path(str(ROOT / "scripts/browser-phase-1.py"))
check = phase1["check"]


def near(page, question_id):
    page.evaluate("id=>{app.camera.position.copy(harness.approach(id));app.education.update()}", question_id)


def resume_checks(browser, origin):
    context, page, errors = phase1["open_harness"](browser, origin)
    observe_pointer_lock(page)
    quiz = page.locator(".education-quiz:not(.education-selector)")
    close = quiz.locator("[data-close]")
    near(page, "Q01")
    page.locator(".walk-prompt").click()
    wait_for_pointer_lock(page, "initial prompt")
    page.evaluate("""() => {
      window.lockAttempts=0;window.realLock=app.canvas.requestPointerLock.bind(app.canvas);
      window.lockFailures=[];
      app.canvas.requestPointerLock=(...args)=>{lockAttempts++;const result=realLock(...args);result?.catch(error=>lockFailures.push(error.message));return result};
    }""")
    for index in range(4):
        page.keyboard.down("w")
        page.keyboard.press("x")
        check(quiz.is_visible() and close.inner_text() == "Close & Resume", "Locked opening lost resume eligibility")
        check(page.evaluate("document.pointerLockElement===null && app.director.isInputSuspended()"), "Quiz did not unlock/suspend")
        before = page.evaluate("({position:app.camera.position.toArray(),rotation:app.camera.quaternion.toArray(),attempts:lockAttempts})")
        prepare_pointer_lock_gesture(page)
        if index % 2:
            close.focus()
            page.keyboard.press("Enter")
        else:
            close.click()
        wait_for_pointer_lock(page, f"Close & Resume cycle {index + 1} ({'keyboard' if index % 2 else 'mouse'})")
        check(page.evaluate("lockAttempts") == before["attempts"] + 1, "Close did not make exactly one lock request")
        page.evaluate("""before => {
          if(app.camera.quaternion.angleTo(new harness.THREE.Quaternion(...before.rotation))>1e-7)throw Error('Resume orientation jump');
          const rotation=app.camera.quaternion.clone();
          window.dispatchEvent(new MouseEvent('mousemove',{movementX:130,movementY:-130}));
          for(let i=0;i<120;i++)app.director.update(1/60);
          if(app.camera.quaternion.angleTo(rotation)>1e-7)throw Error('Relock spike/idle drift');
          if(app.camera.position.distanceTo(new harness.THREE.Vector3(...before.position))>1e-7)throw Error('Held W replayed');
        }""", before)
        page.keyboard.up("w")
    # Escape and synthetic/programmatic closes are never resume gestures.
    for method in ["escape", "programmatic", "synthetic"]:
        page.keyboard.press("x")
        attempts = page.evaluate("lockAttempts")
        if method == "escape":
            page.keyboard.press("Escape")
        elif method == "programmatic":
            page.evaluate("app.education.modal.close()")
        else:
            page.evaluate("app.education.modal.dialog.querySelector('[data-close]').dispatchEvent(new MouseEvent('click',{bubbles:true}))")
        check(page.evaluate("document.pointerLockElement===null && lockAttempts===%d" % attempts), f"{method} forced lock")
        check(page.locator(".walk-prompt").is_visible(), "No explicit resume fallback")
        prepare_pointer_lock_gesture(page)
        page.locator(".walk-prompt").click()
        wait_for_pointer_lock(page, f"explicit prompt after {method} close")
    # A browser refusal is handled once by the existing request API.
    page.keyboard.press("x")
    page.evaluate("() => {app.canvas.requestPointerLock=()=>{lockAttempts++;return Promise.reject(new DOMException('Test policy block','NotAllowedError'))}}")
    attempts = page.evaluate("lockAttempts")
    close.click()
    page.wait_for_timeout(150)
    check(page.evaluate("document.pointerLockElement===null && lockAttempts===%d" % (attempts + 1)), "Blocked request retried or locked")
    check(page.get_by_role("button", name="Click to resume looking around", exact=True).is_visible(), "Blocked lock has no clear fallback")
    page.evaluate("() => {app.canvas.requestPointerLock=(...args)=>{lockAttempts++;const result=realLock(...args);result?.catch(error=>lockFailures.push(error.message));return result}}")
    # An opening while already unlocked must not steal Pointer Lock on Close.
    page.keyboard.press("x")
    check(close.inner_text() == "Close", "Unlocked quiz advertises automatic resume")
    attempts = page.evaluate("lockAttempts")
    close.click()
    check(page.evaluate("document.pointerLockElement===null && lockAttempts===%d" % attempts), "Unlocked opening stole lock")
    # Headless Chromium focuses every page by default. CDP focus emulation
    # produces actual browser focus/blur events without pretending this is a
    # physical OS/browser-tab acceptance test.
    prepare_pointer_lock_gesture(page)
    page.locator(".walk-prompt").click()
    wait_for_pointer_lock(page, "explicit prompt after mocked denial", timeout=5000)
    page.keyboard.press("x")
    attempts = page.evaluate("lockAttempts")
    other = context.new_page()
    other.goto("about:blank")
    other.bring_to_front()
    focus = context.new_cdp_session(page)
    focus.send("Emulation.setFocusEmulationEnabled", {"enabled": False})
    page.wait_for_function("!document.hasFocus()", timeout=5000)
    page.bring_to_front()
    focus.send("Emulation.setFocusEmulationEnabled", {"enabled": True})
    page.wait_for_function("document.hasFocus()")
    check(quiz.is_visible() and page.evaluate("document.pointerLockElement===null && lockAttempts===%d" % attempts), "Focus return auto-locked or closed quiz")
    page.keyboard.press("Escape")
    other.close()
    context.route("**/assignments/*.json", lambda route: route.fulfill(content_type="application/json", body='{"schemaVersion":1,"units":[]}'))
    page.get_by_role("button", name="Assignments", exact=True).click()
    page.keyboard.press("Escape")
    check(page.evaluate("!app.education.selector.isOpen() && document.pointerLockElement===null"), "Assignments close was changed")
    check(not errors, f"Resume browser errors: {errors}")
    context.close()
    print("PASS Close & Resume: mouse/keyboard trusted relock, first-event filtering, idle/held-key cleanup, Escape/programmatic/unlocked safety, blocked request fallback, browser focus emulation, Assignments")


def resource_checks(browser, origin):
    context, page, errors = phase1["open_harness"](browser, origin)
    units = [json.loads((ROOT / "tests/fixtures/S01.json").read_text(encoding="utf-8")),
             json.loads((ROOT / "tests/fixtures/v2/S02.json").read_text(encoding="utf-8"))]
    for unit in units:
        unit["googleFormUrl"] += "?unit=" + unit["unitId"]
        for question in unit["questions"]:
            question["questionVideoUrl"] += f"&unit={unit['unitId']}&q={question['id']}"
            question["explanationVideoUrl"] += f"?unit={unit['unitId']}&q={question['id']}"
        unit["questions"][0]["explanationText"] = "First line\n<img src=x onerror='window.injected=true'>\nLiteral explanation 測試"
    files = {f"{unit['unitId']}.json": unit for unit in units}
    files["manifest.json"] = {"schemaVersion": 1, "units": [
        {"unitId": unit["unitId"], "title": unit["title"], "file": f"{unit['unitId']}.json"} for unit in units]}
    held, hold, providers = [], set(), []

    def handle_assignment(route):
        name = urlsplit(route.request.url).path.rsplit("/", 1)[-1]
        if name in hold:
            held.append(route)
        elif files.get(name) == "HTTP503":
            route.fulfill(status=503, body="Unavailable")
        else:
            route.fulfill(content_type="application/json", body=json.dumps(files[name], ensure_ascii=False))

    def handle_provider(route):
        if route.request.resource_type == "document":
            providers.append(route.request.url)
        route.fulfill(content_type="text/html", body="<!doctype html><title>Intercepted fixture provider</title><p>No external request was sent.</p>")

    page.route("**/assignments/*.json", handle_assignment)
    for pattern in ["https://www.youtube.com/**", "https://youtube.com/**", "https://youtu.be/**", "https://forms.gle/**", "https://docs.google.com/**"]:
        context.route(pattern, handle_provider)
    quiz = page.locator(".education-quiz:not(.education-selector)")
    selector = page.locator(".education-selector")
    hud_form = page.locator("[data-hud-form]")
    dialog_form = quiz.locator("[data-dialog-form]")

    def open_selector():
        page.get_by_role("button", name="Assignments", exact=True).click()
        selector.locator("[data-status]").filter(has_text="Reading").wait_for(state="hidden")

    def choose(unit_id):
        selector.locator("select").select_option(unit_id)
        selector.get_by_role("button", name="Load unit", exact=True).click()

    def activate(unit_id):
        open_selector()
        choose(unit_id)
        selector.get_by_role("button", name="Replace and load").click()
        page.wait_for_function("id=>app.education.progress.unitId===id && !app.education.selector.isOpen()", arg=unit_id)

    def native_link(link, url, keyboard=False):
        check(link.get_attribute("href") == url, "Validated URL changed")
        check(link.get_attribute("target") == "_blank" and set(link.get_attribute("rel").split()) == {"noopener", "noreferrer"}, "Unsafe external link")
        count = len(providers)
        with context.expect_page() as popup_info:
            if keyboard:
                link.focus()
                page.keyboard.press("Enter")
            else:
                link.click()
        popup = popup_info.value
        popup.wait_for_load_state()
        check(popup.url == url, "Native link rewrote destination")
        check(popup.evaluate("window.opener===null"), "External tab retains opener")
        check(len(providers) == count + 1, "Fixture provider was not intercepted")
        popup.close()
        page.bring_to_front()
        check(page.evaluate("document.pointerLockElement===null"), "Provider return stole Pointer Lock")

    # Completed demo still exposes zero URLs.
    page.evaluate("for(const q of app.education.progress.questions)app.education.progress.submit(q.id,q.answer)")
    near(page, "Q01")
    page.keyboard.press("x")
    check(quiz.locator("a[href]").count() == 0 and hud_form.get_attribute("href") is None, "Demo fabricated a resource")
    quiz.locator("[data-close]").click()

    for unit_index, unit in enumerate(units):
        if unit_index == 0:
            activate(unit["unitId"])
        check(page.evaluate("app.education.progress.count") == 0, "Valid replacement did not reset progress")
        check(hud_form.get_attribute("href") is None and quiz.locator("a[href]").count() == 0, "Stale unit links survived replacement")
        for index, question in enumerate(unit["questions"]):
            near(page, question["id"])
            page.keyboard.press("x")
            video = quiz.locator("[data-question-video]")
            explanation = quiz.locator("[data-explanation-video]")
            check(video.is_visible() and video.get_attribute("href") == question["questionVideoUrl"], "Question video is unavailable")
            check(explanation.get_attribute("href") is None and dialog_form.get_attribute("href") is None, "Explanation/Form unlocked before pass")
            if index == 0:
                count = page.evaluate("app.education.progress.count")
                native_link(video, question["questionVideoUrl"], keyboard=unit_index == 1)
                check(quiz.is_visible() and page.evaluate("app.education.progress.count") == count, "Question tab changed quiz/progress")
                accepted = question.get("correctOptions", [question.get("correctOption")])
                wrong = next(i for i, label in enumerate("ABCD"[:len(question["options"])]) if label not in accepted)
                quiz.locator(f'input[value="{wrong}"]').check()
                quiz.get_by_role("button", name="Check answer").click()
                check(explanation.get_attribute("href") is None, "Incorrect answer unlocked explanation")
                quiz.get_by_role("button", name="Try again").click()
            answer = question["correctOption"] if unit["schemaVersion"] == 1 else question["correctOptions"][-1]
            quiz.locator(f'input[value="{"ABCD".index(answer)}"]').check()
            quiz.get_by_role("button", name="Check answer").click()
            check(explanation.is_visible() and explanation.get_attribute("href") == question["explanationVideoUrl"], "Correct alternative did not unlock explanation")
            if index == 0:
                text = quiz.locator("[data-explanation-text]")
                check(text.text_content() == question["explanationText"], "Explanation text/line breaks changed")
                check(text.evaluate("e=>getComputedStyle(e).whiteSpace") == "pre-wrap" and text.locator("img").count() == 0, "Explanation markup executed")
                native_link(explanation, question["explanationVideoUrl"], keyboard=True)
                check(quiz.is_visible() and page.evaluate("app.education.progress.hasPassed('Q01')"), "Explanation tab lost pass")
            check(quiz.locator("iframe,video").count() == 0, "Embedded/autoplay media added")
            last = index == len(unit["questions"]) - 1
            if last:
                check(dialog_form.is_visible() and dialog_form.get_attribute("href") == unit["googleFormUrl"], "Completion Form did not unlock")
                native_link(dialog_form, unit["googleFormUrl"])
            else:
                check(dialog_form.get_attribute("href") is None and hud_form.get_attribute("href") is None, "Form unlocked before required total")
            quiz.locator("[data-close]").click()
            check(page.evaluate("app.education.terminals.entries.find(t=>t.id===%s).indicator.material.color.getHex()===0x48e38b" % json.dumps(question["id"])), "Passed indicator not green")
        check(hud_form.is_visible(), "Completed Form not prominent in HUD")
        check(page.evaluate("app.camera.position.distanceTo(new harness.THREE.Vector3(...harness.FREE_CAMERA_START.position))>50"), "Completion check accidentally returned to spawn")
        native_link(hud_form, unit["googleFormUrl"], keyboard=True)
        near(page, "Q01")
        page.keyboard.press("x")
        check(quiz.locator("[data-explanation-video]").is_visible(), "Completed explanation cannot be revisited")
        check(quiz.locator("[data-explanation-text]").text_content() == unit["questions"][0]["explanationText"], "Revisited text lost")
        quiz.locator("[data-close]").click()
        if unit_index == 0:
            # Keep the completed Form on failed/canceled/stale replacements.
            original = deepcopy(files["S02.json"])
            files["S02.json"] = "HTTP503"
            open_selector(); choose("S02")
            selector.get_by_role("button", name="Replace and load").click()
            page.wait_for_function("document.querySelector('.education-selector [data-warning]').hidden")
            check(hud_form.get_attribute("href") == unit["googleFormUrl"], "Failed replacement cleared completed Form")
            selector.get_by_role("button", name="Close", exact=True).click()
            files["S02.json"] = original
            open_selector(); choose("S02")
            selector.get_by_role("button", name="Keep current unit").click()
            check(hud_form.get_attribute("href") == unit["googleFormUrl"], "Canceled confirmation cleared Form")
            selector.get_by_role("button", name="Close", exact=True).click()
            hold.add("S02.json")
            open_selector(); choose("S02")
            selector.get_by_role("button", name="Replace and load").click()
            selector.get_by_role("button", name="Close", exact=True).click()
            for request in held:
                try:
                    request.fulfill(content_type="application/json", body=json.dumps(original))
                except Error:
                    pass
            hold.clear()
            check(hud_form.get_attribute("href") == unit["googleFormUrl"] and page.evaluate("app.education.progress.complete"), "Stale/canceled request cleared completion")
            activate("S02")
    check(not page.evaluate("Boolean(window.injected)"), "Explanation text executed")
    page.reload(); page.wait_for_function("window.harness"); page.evaluate("harness.setup()")
    check(page.evaluate("app.education.progress.mode==='demo' && app.education.progress.count===0"), "Reload retained assignment progress")
    check(page.locator("[data-hud-form]").get_attribute("href") is None, "Reload retained Form")
    check(not errors, f"Learning workflow errors: {errors}")
    context.close()
    print(f"PASS learning workflow: native safe exact-URL click/keyboard tabs ({len(providers)} intercepted), optional question/explanation, literal multiline text, v1 4/4 + v2 5/5 Forms in HUD/dialog away from spawn, retained/canceled/stale completion, cleared replacement links, green indicators, Demo/reload isolation")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--origin", default="https://127.0.0.1:5173")
    parser.add_argument("--cafile", required=True)
    parser.add_argument("--headed", action="store_true", help="Use a real display (Linux CI: xvfb-run)")
    args = parser.parse_args()
    pub = subprocess.check_output(["openssl", "x509", "-in", args.cafile, "-pubkey", "-noout"])
    der = subprocess.run(["openssl", "pkey", "-pubin", "-outform", "der"], input=pub, capture_output=True, check=True).stdout
    spki = base64.b64encode(hashlib.sha256(der).digest()).decode()
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get("CHROMIUM_EXECUTABLE", "/usr/bin/chromium"), headless=not args.headed, args=["--no-sandbox", "--ignore-certificate-errors-spki-list=" + spki])
        print(f"Phase 3 browser: Chromium {browser.version}, headed={args.headed}", flush=True)
        resume_checks(browser, args.origin)
        resource_checks(browser, args.origin)
        browser.close()


if __name__ == "__main__":
    main()
