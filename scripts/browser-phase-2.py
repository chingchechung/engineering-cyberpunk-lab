#!/usr/bin/env python3
"""Phase 2 real DOM tests with intercepted synthetic assignment responses.

No fixture is published. No video/Form navigation or GPU rendering is exercised.
Uses the same original-geometry harness and certificate trust as Phase 1.
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

ROOT = Path(__file__).resolve().parents[1]
phase1 = runpy.run_path(str(ROOT / "scripts/browser-phase-1.py"))
check = phase1["check"]


def fixture(version, unit_id):
    return json.loads((ROOT / "tests/fixtures" / ("v2" if version == 2 else "") / f"{unit_id}.json").read_text(encoding="utf-8"))


def assignment_checks(browser, origin):
    context, page, errors = phase1["open_harness"](browser, origin)
    files = {"manifest.json": {"schemaVersion": 1, "units": []}}
    calls, held, hold = [], [], set()

    def handle(route):
        path = urlsplit(route.request.url).path
        name = path.rsplit("/", 1)[-1]
        calls.append(path)
        if name in hold:
            held.append(route)
            return
        value = files.get(name)
        if value == "HTTP503":
            route.fulfill(status=503, body="Unavailable")
        elif value == "BAD_JSON":
            route.fulfill(content_type="application/json", body="{")
        else:
            route.fulfill(status=200 if value is not None else 404,
                          content_type="application/json", body=json.dumps(value, ensure_ascii=False))

    page.route("**/assignments/*.json", handle)
    page.evaluate("""() => {
      window.savedPosition=app.camera.position.toArray();
      window.savedLocalKeys=Object.keys(localStorage);window.savedSessionKeys=Object.keys(sessionStorage);
      window.backgroundClicks=0;window.backgroundKeys=0;
      document.querySelector('#background').addEventListener('click',()=>backgroundClicks++);
      window.addEventListener('keydown',()=>backgroundKeys++);
    }""")
    selector = page.locator(".education-selector")
    quiz = page.locator(".education-quiz:not(.education-selector)")

    def open_selector():
        page.get_by_role("button", name="Assignments", exact=True).click()
        selector.locator("[data-status]").filter(has_text="Reading").wait_for(state="hidden")

    def choose(unit_id):
        selector.locator("select").select_option(unit_id)
        selector.get_by_role("button", name="Load unit", exact=True).click()

    def confirm_load():
        selector.get_by_role("button", name="Replace and load").click()

    def answer_near(question_id, index):
        page.evaluate("""id => {
          const t=harness.TERMINAL_LAYOUT.find(t=>t.id===id);
          app.camera.position.copy(harness.approach(id));
          app.education.update();
        }""", question_id)
        page.keyboard.press("x")
        quiz.locator(f'input[value="{index}"]').check()
        quiz.get_by_role("button", name="Check answer").click()

    open_selector()
    check("Demo Mode" in selector.locator("[data-status]").inner_text(), "Empty list did not retain demo")
    check(selector.locator("select").is_disabled(), "Empty list permits loading")
    check(page.evaluate("app.director.isInputSuspended() && document.pointerLockElement===null"), "Selector did not suspend input")
    for _ in range(10):
        page.keyboard.press("Tab")
        check(page.evaluate("app.education.selector.dialog.contains(document.activeElement)"), "Selector focus escaped")
    key_count = page.evaluate("backgroundKeys")
    for key in ["w", "r", "p", "x"]:
        page.keyboard.press(key)
    page.mouse.click(30, 30)
    page.evaluate("document.querySelector('.app-header-settings-btn').dispatchEvent(new MouseEvent('click',{bubbles:true}))")
    check(page.evaluate("backgroundClicks===0 && backgroundKeys===%d && app.shell.uiState.openedPanel==='assignments'" % key_count), "Selector input leaked")
    page.keyboard.press("Escape")
    check(not selector.is_visible(), "Escape did not close selector")
    answer_near("Q01", 0)
    quiz.locator("[data-close]").click()
    check(page.evaluate("app.education.progress.count") == 1, "Demo no longer works")

    units = [fixture(2, "S01"), fixture(1, "S02"), fixture(2, "S02"), fixture(1, "S01")]
    units[2]["unitId"] = "S03"
    units[3]["unitId"] = "S04"
    units[0]["questions"][0]["title"] = '<img src=x onerror="window.injected=true"> literal 測試'
    files.update({f"{unit['unitId']}.json": unit for unit in units})
    files["manifest.json"] = {"schemaVersion": 1, "units": [
        {"unitId": unit["unitId"], "title": unit["title"], "file": f"{unit['unitId']}.json"} for unit in units]}
    open_selector()
    check(selector.locator("option").count() == 4, "Published unit list is incorrect")
    before_calls = len(calls)
    choose("S01")
    check(len(calls) == before_calls, "Unit fetched before confirmation")
    selector.get_by_role("button", name="Keep current unit").click()
    check(page.evaluate("app.education.progress.mode==='demo' && app.education.progress.count===1"), "Cancel erased demo")
    page.evaluate("window.savedPosition=app.camera.position.toArray()")
    choose("S01")
    confirm_load()
    page.wait_for_function("app.education.progress.unitId==='S01' && !app.education.selector.isOpen()")
    check(page.evaluate("app.education.progress.count===0 && JSON.stringify(app.camera.position.toArray())===JSON.stringify(savedPosition)"), "Valid switch did not reset only progress")
    check(page.evaluate("!app.education.terminals.entries[4].group.visible && !app.world.colliders.includes(app.education.terminals.entries[4].collider)"), "Q05 is not hidden/deactivated")
    page.evaluate("app.camera.position.copy(harness.approach('Q05'));app.education.update()")
    page.keyboard.press("x")
    check(not quiz.is_visible(), "Hidden Q05 still opens")
    answer_near("Q01", 1)
    check("Incorrect" in quiz.locator("[data-feedback]").inner_text(), "Wrong-answer feedback missing")
    check(quiz.locator("input").count() == 3, "Fake D option added")
    check("literal 測試" in quiz.locator("h2").inner_text() and quiz.locator("img").count() == 0, "Question text treated as markup")
    check(quiz.locator("legend").inner_text() == units[0]["questions"][0]["prompt"], "Published prompt changed")
    check(quiz.locator("iframe,video").count() == 0, "Embedded media was added")
    quiz.get_by_role("button", name="Try again").click()
    quiz.locator('input[value="0"]').check()
    quiz.get_by_role("button", name="Check answer").click()
    quiz.locator("[data-close]").click()
    answer_near("Q02", 2)  # v2 accepts C as well as B, with a single radio selection.
    check("Correct" in quiz.locator("[data-feedback]").inner_text(), "v2 membership failed")
    quiz.locator("[data-close]").click()
    check(page.evaluate("app.education.progress.count") == 2, "Progress did not advance independently")
    for bad in ["HTTP503", "BAD_JSON", {**deepcopy(units[1]), "unknown": True}]:
        files["S02.json"] = bad
        open_selector()
        choose("S02")
        confirm_load()
        page.wait_for_function("document.querySelector('.education-selector [data-warning]').hidden")
        check(selector.is_visible() and selector.locator("[data-status]").inner_text(), "Load failure disrupted selector")
        check(page.evaluate("app.education.progress.unitId==='S01' && app.education.progress.count===2"), "Load failure corrupted active progress")
        selector.get_by_role("button", name="Close", exact=True).click()
    files["S02.json"] = units[1]

    # Cancellation while a response is held, followed by a newer successful unit.
    hold.add("S02.json")
    open_selector()
    choose("S02")
    confirm_load()
    check(len(held) == 1, "Deferred request not observed")
    selector.get_by_role("button", name="Close", exact=True).click()
    check(page.evaluate("app.education.progress.unitId==='S01' && app.education.progress.count===2"), "Pending cancel changed progress")
    open_selector()
    choose("S02")
    confirm_load()
    check(len(held) == 2, "Second deferred request not observed")
    selector.get_by_role("button", name="Refresh list").click()
    selector.locator("[data-status]").filter(has_text="Reading").wait_for(state="hidden")
    choose("S03")
    confirm_load()
    page.wait_for_function("app.education.progress.unitId==='S03'")
    for request in held:
        try:
            request.fulfill(content_type="application/json", body=json.dumps(units[1]))
        except Error:  # Browser may already have canceled its transport.
            pass
    hold.clear()
    check(page.evaluate("app.education.progress.unitId==='S03' && app.education.progress.count===0"), "Stale response replaced newer unit")
    check(page.evaluate("app.education.terminals.entries[4].group.visible && app.world.colliders.includes(app.education.terminals.entries[4].collider)"), "Five-question unit did not reactivate Q05")
    answer_near("Q05", "ABCD".index(units[2]["questions"][4]["correctOptions"][0]))
    quiz.locator("[data-close]").click()
    page.evaluate("window.savedPosition=app.camera.position.toArray()")
    for manifest in ["HTTP503", {"schemaVersion": 1, "units": []}]:
        files["manifest.json"] = manifest
        open_selector()
        check(selector.locator("select").is_disabled(), "Failed/empty refresh retained old allowlist")
        check(page.evaluate("app.education.progress.unitId==='S03' && app.education.progress.count===1"), "Manifest refresh erased valid unit")
        selector.get_by_role("button", name="Close", exact=True).click()
    files["manifest.json"] = {"schemaVersion": 1, "units": [
        {"unitId": u["unitId"], "title": u["title"], "file": f"{u['unitId']}.json"} for u in units]}
    for unit_id, count in [("S02", 5), ("S04", 4)]:
        open_selector()
        choose(unit_id)
        confirm_load()
        page.wait_for_function("id=>app.education.progress.unitId===id", arg=unit_id)
        check(page.evaluate("app.education.progress.total") == count, "v1 question count incorrect")
        check(page.evaluate("JSON.stringify(app.camera.position.toArray())===JSON.stringify(savedPosition)"), "Unit switching moved player")
    for question in units[3]["questions"]:
        answer_near(question["id"], "ABCD".index(question["correctOption"]))
        quiz.locator("[data-close]").click()
    check(page.locator("[data-progress]").inner_text() == "4/4 questions passed", "Four-question completion requires Q05")
    check(page.evaluate("app.education.progress.complete && !window.injected"), "Completion or text isolation failed")
    check(page.evaluate("JSON.stringify(Object.keys(localStorage))===JSON.stringify(savedLocalKeys) && JSON.stringify(Object.keys(sessionStorage))===JSON.stringify(savedSessionKeys)"), "Assignment progress wrote to storage")
    # Test the loader's default path on an actual nested document URL.
    page.evaluate("""async () => {
      const {createAssignmentLoader}=await import('/src/education/assignments/assignment-loader.js');
      history.replaceState(null,'','/faculty/course/lab/');
      await createAssignmentLoader().refresh();
    }""")
    check(calls[-1] == "/faculty/course/lab/assignments/manifest.json", "Default loader lost document subdirectory")
    page.goto(origin + "/tests/harness.html")
    page.wait_for_function("window.harness")
    page.evaluate("harness.setup()")
    check(page.evaluate("app.education.progress.mode==='demo' && app.education.progress.count===0"), "Fresh page retained assignment progress")
    check(not errors, f"Phase 2 browser errors: {errors}")
    context.close()
    print("PASS Phase 2 DOM: demo, v1/v2 selection, confirmation/cancel, failed/stale loads, retained/reset progress, Q05, 3 choices, retry/membership, safe text, modal isolation, session-only state, nested assignment paths")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--origin", default="https://127.0.0.1:5173")
    parser.add_argument("--cafile", type=Path, required=True)
    parser.add_argument("--chromium", default=os.environ.get("CHROMIUM_EXECUTABLE", "/usr/bin/chromium"))
    args = parser.parse_args()
    pub = subprocess.check_output(["openssl", "x509", "-in", str(args.cafile), "-pubkey", "-noout"])
    der = subprocess.run(["openssl", "pkey", "-pubin", "-outform", "der"], input=pub, check=True, capture_output=True).stdout
    spki = base64.b64encode(hashlib.sha256(der).digest()).decode()
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=args.chromium, headless=True,
                                  args=["--no-sandbox", "--ignore-certificate-errors-spki-list=" + spki])
        assignment_checks(browser, args.origin)
        browser.close()


if __name__ == "__main__":
    main()
