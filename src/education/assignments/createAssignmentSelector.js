import { createModalBarrier } from "../createModalBarrier.js";

// Adapted from Engineering City Lab's selector. No attempt is replaced until
// explicit confirmation and a complete validated loader commit.
export function createAssignmentSelector({ loader, session, available, onOpen, onClose, focusFallback }) {
  const dialog = document.createElement("dialog");
  dialog.className = "education-quiz education-selector";
  dialog.setAttribute("aria-labelledby", "assignment-heading");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("data-ui-block-look", "true");
  dialog.innerHTML = `<header><h2 id="assignment-heading">Assignments</h2>
    <button type="button" data-close>Close</button></header>
    <p data-current></p>
    <label for="assignment-unit">Published unit</label>
    <select id="assignment-unit" disabled></select>
    <div class="education-actions"><button type="button" data-load disabled>Load unit</button>
      <button type="button" data-refresh>Refresh list</button></div>
    <p data-status role="status" aria-live="polite"></p>
    <section data-warning hidden aria-label="Confirm replacement"><p data-warning-text></p>
      <div class="education-actions"><button type="button" data-confirm>Replace and load</button>
        <button type="button" data-cancel>Keep current unit</button></div></section>
    <p class="education-resume">Question progress is kept only in this page session. Switching units keeps your city location.</p>`;
  document.body.append(dialog);
  const select = dialog.querySelector("select");
  const load = dialog.querySelector("[data-load]");
  const status = dialog.querySelector("[data-status]");
  const warning = dialog.querySelector("[data-warning]");
  const confirm = dialog.querySelector("[data-confirm]");
  const closeButton = dialog.querySelector("[data-close]");
  let pending = null;
  let generation = 0;
  function invalidate() {
    generation++;
    pending = null;
    warning.hidden = true;
    loader.cancel();
  }
  const barrier = createModalBarrier({ dialog, onOpen, focusFallback, initialFocus: closeButton,
    onClose() { invalidate(); onClose?.(); } });
  function choices() {
    select.replaceChildren(...loader.units.map((entry) => {
      const option = document.createElement("option");
      option.value = entry.unitId;
      option.textContent = `${entry.unitId} · ${entry.title}`;
      return option;
    }));
    if (loader.units.some((entry) => entry.unitId === session.unitId)) select.value = session.unitId;
    select.disabled = load.disabled = !loader.units.length;
  }
  async function refresh() {
    invalidate();
    const token = generation;
    select.disabled = load.disabled = true;
    status.textContent = "Reading published units…";
    const result = await loader.refresh();
    if (token !== generation || !barrier.isOpen()) return;
    choices();
    if (!result.ok) { if (!result.cancelled) status.textContent = result.message; return; }
    status.textContent = loader.units.length
      ? "Select a unit. Your current progress is kept until a replacement loads successfully."
      : session.mode === "demo" ? "No published units. Close to continue Demo Mode."
        : "No published units. Your active assignment and progress are kept.";
  }
  load.addEventListener("click", () => {
    invalidate();
    pending = loader.units.find((entry) => entry.unitId === select.value);
    if (!pending) return;
    dialog.querySelector("[data-warning-text]").textContent = `Start ${pending.unitId}? This replaces current question progress only after the unit loads successfully. Your city location is kept.`;
    warning.hidden = false;
    confirm.disabled = false;
    confirm.focus();
  });
  confirm.addEventListener("click", async () => {
    if (!pending || !loader.units.includes(pending)) return;
    const token = generation;
    const entry = pending;
    pending = null;
    confirm.disabled = select.disabled = load.disabled = true;
    status.textContent = `Loading ${entry.unitId}…`;
    const result = await loader.load(entry.unitId);
    if (token !== generation || !barrier.isOpen()) return;
    warning.hidden = true;
    choices();
    if (result.ok) barrier.close();
    else if (!result.cancelled) { status.textContent = result.message; select.focus(); }
  });
  select.addEventListener("change", () => { invalidate(); status.textContent = "Select Load unit to continue."; });
  dialog.querySelector("[data-cancel]").addEventListener("click", () => {
    invalidate();
    choices();
    status.textContent = "Replacement cancelled. Your current progress is kept.";
    load.focus();
  });
  dialog.querySelector("[data-refresh]").addEventListener("click", refresh);
  closeButton.addEventListener("click", barrier.close);
  return {
    dialog,
    isOpen: barrier.isOpen,
    close: barrier.close,
    open() {
      if (!available() || !barrier.open()) return false;
      dialog.querySelector("[data-current]").textContent = session.unit
        ? `Active: ${session.unitId} · ${session.unit.title} (${session.count}/${session.total} passed)`
        : `Active: Demo Mode (${session.count}/${session.total} passed)`;
      refresh();
      return true;
    },
    destroy() { invalidate(); barrier.destroy(); },
  };
}
