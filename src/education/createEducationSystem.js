import "./education.css";
import * as THREE from "three/webgpu";
import { createQuizProgress } from "./demoQuestions.js";
import { createTerminals } from "./createTerminals.js";
import { findNearbyTerminal } from "./terminalLayout.js";
import { createQuizModal } from "./createQuizModal.js";

export function createEducationSystem({ scene, camera, cameraDirector, uiState, isReady, domElement, colliders = [] }) {
  const progress = createQuizProgress();
  const terminals = createTerminals({ scene });
  const sceneColliders = [...colliders];
  const raycaster = new THREE.Raycaster();
  const display = new THREE.Vector3();
  const direction = new THREE.Vector3();
  let lastPrompt = "";
  let lastLookMode = null;
  const hud = document.createElement("aside");
  hud.className = "education-hud";
  hud.hidden = true;
  hud.setAttribute("aria-label", "Demo question progress");
  hud.innerHTML = `<p class="education-kicker">Engineering lab · demo</p>
    <p data-progress role="status" aria-live="polite"></p>
    <p data-look></p><p>Find the yellow Q01–Q05 terminals.</p>`;
  const prompt = document.createElement("button");
  prompt.type = "button";
  prompt.className = "education-prompt";
  prompt.hidden = true;
  prompt.setAttribute("data-ui-block-look", "true");
  document.body.append(hud, prompt);
  if (!domElement.hasAttribute("tabindex")) domElement.tabIndex = -1;

  function refreshProgress() {
    hud.querySelector("[data-progress]").textContent = `${progress.getCompleted()}/${progress.questions.length} questions passed`;
  }
  refreshProgress();

  const modal = createQuizModal({
    progress,
    focusFallback: domElement,
    onOpen() {
      cameraDirector.setInputSuspended(true);
      uiState.openPanel("quiz");
      prompt.hidden = true;
    },
    onClose() {
      if (uiState.openedPanel === "quiz") uiState.closePanel();
      // clear again on close; resumption always needs a new pointer-lock click.
      cameraDirector.setInputSuspended(Boolean(uiState.openedPanel));
      update();
    },
    onProgress: refreshProgress,
  });

  function canInteract() {
    return isReady() && !uiState.openedPanel && !modal.isOpen() &&
      cameraDirector.walkControls?.isActive() && !cameraDirector.isInputSuspended() &&
      document.hasFocus() && !document.hidden;
  }

  function getNearby() {
    const terminal = findNearbyTerminal(camera.position);
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
    progress, terminals, modal, update,
    destroy() {
      window.removeEventListener("keydown", onKeyDown);
      modal.destroy();
      terminals.destroy();
      hud.remove();
      prompt.remove();
    },
  };
}
