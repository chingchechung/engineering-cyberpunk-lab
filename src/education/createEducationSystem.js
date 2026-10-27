import "./education.css";
import * as THREE from "three/webgpu";
import { createTerminals } from "./createTerminals.js";
import { findNearbyTerminal, TERMINAL_LAYOUT } from "./terminalLayout.js";
import { createQuizModal } from "./createQuizModal.js";
import { createAssignmentSession } from "./assignments/assignment-session.js";
import { createAssignmentLoader } from "./assignments/assignment-loader.js";
import { createAssignmentSelector } from "./assignments/createAssignmentSelector.js";

export function createEducationSystem({ scene, camera, cameraDirector, uiState, isReady, domElement, colliders = [] }) {
  const progress = createAssignmentSession();
  const terminals = createTerminals({ scene });
  const sceneColliders = [...colliders];
  const raycaster = new THREE.Raycaster();
  const display = new THREE.Vector3();
  const direction = new THREE.Vector3();
  let lastPrompt = "";
  let lastLookMode = null;
  let activeLayout = TERMINAL_LAYOUT;
  const hud = document.createElement("aside");
  hud.className = "education-hud";
  hud.hidden = true;
  hud.setAttribute("aria-label", "Question progress");
  hud.innerHTML = `<p class="education-kicker">Engineering lab · demo</p>
    <p data-progress role="status" aria-live="polite"></p>
    <p data-look></p><p data-terminal-help>Find the yellow Q01–Q05 terminals.</p>
    <button type="button" data-select-units data-ui-block-look="true">Assignments</button>`;
  const prompt = document.createElement("button");
  prompt.type = "button";
  prompt.className = "education-prompt";
  prompt.hidden = true;
  prompt.setAttribute("data-ui-block-look", "true");
  document.body.append(hud, prompt);
  if (!domElement.hasAttribute("tabindex")) domElement.tabIndex = -1;

  function refreshProgress() {
    hud.querySelector("[data-progress]").textContent = `${progress.getCompleted()}/${progress.questions.length} questions passed`;
    hud.querySelector(".education-kicker").textContent = progress.mode === "demo" ? "Engineering lab · Demo Mode"
      : `${progress.unitId} · ${progress.unit.title}`;
    hud.querySelector("[data-terminal-help]").textContent = `Find the yellow Q01–Q0${progress.total} terminals.`;
  }
  refreshProgress();

  function resume(panel) {
    if (uiState.openedPanel === panel) uiState.closePanel();
    cameraDirector.setInputSuspended(Boolean(uiState.openedPanel));
    update();
  }

  const modal = createQuizModal({
    progress,
    focusFallback: domElement,
    onOpen() {
      cameraDirector.setInputSuspended(true);
      uiState.openPanel("quiz");
      prompt.hidden = true;
    },
    onClose() {
      // clear again on close; resumption always needs a new pointer-lock click.
      resume("quiz");
    },
    onProgress: refreshProgress,
  });

  const loader = createAssignmentLoader({ onReady: (unit, file) => progress.activate(unit, file) });
  const selector = createAssignmentSelector({ loader, session: progress,
    available: () => isReady() && !uiState.openedPanel && !modal.isOpen(),
    focusFallback: domElement,
    onOpen() {
      cameraDirector.setInputSuspended(true);
      uiState.openPanel("assignments");
      prompt.hidden = true;
    },
    onClose: () => resume("assignments"),
  });
  hud.querySelector("[data-select-units]").addEventListener("click", selector.open);

  function syncSession() {
    activeLayout = TERMINAL_LAYOUT.filter((terminal) => progress.getQuestion(terminal.id));
    for (const entry of terminals.entries) {
      const enabled = Boolean(progress.getQuestion(entry.id));
      entry.group.visible = enabled;
      const index = colliders.indexOf(entry.collider);
      if (!enabled && index !== -1) colliders.splice(index, 1);
      if (enabled && index === -1) colliders.push(entry.collider);
    }
    refreshProgress();
    update();
  }
  const unsubscribeSession = progress.subscribe(syncSession);
  syncSession();

  function canInteract() {
    return isReady() && !uiState.openedPanel && !modal.isOpen() &&
      cameraDirector.walkControls?.isActive() && !cameraDirector.isInputSuspended() &&
      document.hasFocus() && !document.hidden;
  }

  function getNearby() {
    const terminal = findNearbyTerminal(camera.position, activeLayout);
    if (!terminal) return null;
    display.set(...terminal.position);
    display.y += 1.2;
    direction.subVectors(display, camera.position);
    const distance = direction.length();
    raycaster.set(camera.position, direction.normalize());
    raycaster.far = Math.max(0, distance - 0.35);
    raycaster.firstHitOnly = true;
    return raycaster.intersectObjects(sceneColliders, true).length ? null : terminal;
  }

  function interact() {
    if (!canInteract()) return false;
    const terminal = getNearby();
    return terminal ? modal.open(terminal.id) : false;
  }

  function onKeyDown(event) {
    if (event.code !== "KeyX" || event.repeat || event.ctrlKey || event.altKey || event.metaKey ||
      event.target?.closest?.("input, textarea, select, [contenteditable]")) return;
    if (interact()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }
  window.addEventListener("keydown", onKeyDown);
  prompt.addEventListener("click", interact);

  function update() {
    hud.hidden = !isReady() || Boolean(uiState.openedPanel);
    const horizontalOnly = cameraDirector.walkControls?.isHorizontalOnly();
    if (horizontalOnly !== lastLookMode) {
      hud.querySelector("[data-look]").textContent = `Look: ${horizontalOnly ? "horizontal only" : "full"} · R: level · P: toggle`;
      lastLookMode = horizontalOnly;
    }
    const terminal = canInteract() ? getNearby() : null;
    prompt.hidden = !terminal;
    if (terminal) {
      const copy = `X · Open ${terminal.id}${progress.hasPassed(terminal.id) ? " · Passed" : ""} (or tap)`;
      if (copy !== lastPrompt) prompt.textContent = lastPrompt = copy;
    }
  }

  return {
    progress, terminals, modal, selector, loader, update,
    destroy() {
      window.removeEventListener("keydown", onKeyDown);
      unsubscribeSession();
      selector.destroy();
      modal.destroy();
      for (const collider of terminals.colliders) {
        const index = colliders.indexOf(collider);
        if (index !== -1) colliders.splice(index, 1);
      }
      terminals.destroy();
      hud.remove();
      prompt.remove();
    },
  };
}
