import { createModalBarrier } from "./createModalBarrier.js";
import { questionResources, completionFormUrl, setExternalLink } from "./learningResources.js";

export function createQuizModal({ progress, onOpen, onClose, onProgress, focusFallback, requestPointerLock }) {
  const dialog = document.createElement("dialog");
  dialog.className = "education-quiz";
  dialog.setAttribute("aria-labelledby", "education-question-title");
  dialog.setAttribute("aria-describedby", "education-demo-note");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("data-ui-block-look", "true");
  dialog.innerHTML = `
    <header><p class="education-kicker">Engineering lab · synthetic demo</p>
      <button type="button" data-close>Close</button></header>
    <h2 id="education-question-title"></h2>
    <p id="education-demo-note">Practice questions only. Progress lasts for this visit.</p>
    <div class="education-actions"><a data-question-video hidden>Watch Question Video</a></div>
    <form><fieldset><legend></legend><div data-options></div></fieldset>
      <p data-feedback role="status" aria-live="polite"></p>
      <button type="submit">Check answer</button>
      <button type="button" data-retry hidden>Try again</button>
    </form>
    <section data-explanation hidden aria-label="Optional explanation">
      <a data-explanation-video hidden>Watch English Explanation</a>
      <p data-explanation-text hidden></p>
    </section>
    <p><a data-dialog-form class="education-form-link" hidden>Open Google Form</a></p>
    <p class="education-resume">Close &amp; Resume restores mouse look if this question was opened while locked. If blocked, click to resume looking around. Escape closes without locking.</p>`;
  document.body.append(dialog);
  const closeButton = dialog.querySelector("[data-close]");
  const form = dialog.querySelector("form");
  const options = dialog.querySelector("[data-options]");
  const feedback = dialog.querySelector("[data-feedback]");
  const submitButton = dialog.querySelector("[type=submit]");
  const retryButton = dialog.querySelector("[data-retry]");
  let question = null;
  const barrier = createModalBarrier({ dialog, onOpen, onClose, focusFallback, initialFocus: closeButton, requestPointerLock });
  closeButton.addEventListener("click", barrier.closeAndResume);

  function renderResources() {
    const resources = questionResources(progress, question);
    setExternalLink(dialog.querySelector("[data-question-video]"), resources.questionVideoUrl);
    setExternalLink(dialog.querySelector("[data-explanation-video]"), resources.explanationVideoUrl);
    dialog.querySelector("[data-explanation]").hidden = !resources.explanationVideoUrl;
    const text = dialog.querySelector("[data-explanation-text]");
    text.textContent = resources.explanationText ?? "";
    text.hidden = !resources.explanationText;
    setExternalLink(dialog.querySelector("[data-dialog-form]"), completionFormUrl(progress));
  }
  const unsubscribe = progress.subscribe?.(renderResources);
  renderResources();

  function renderPassed() {
    const passed = progress.hasPassed(question.id);
    for (const input of options.querySelectorAll("input")) input.disabled = passed;
    submitButton.hidden = passed;
    retryButton.hidden = true;
    feedback.textContent = passed ? "Correct. This question is passed." : "";
    renderResources();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const selected = options.querySelector("input:checked");
    if (!selected || progress.hasPassed(question.id)) return;
    const result = progress.submit(question.id, Number(selected.value));
    if (result.correct) {
      renderPassed();
      closeButton.focus();
      onProgress?.();
    } else {
      feedback.textContent = "Incorrect. Try again; completed questions are kept.";
      retryButton.hidden = false;
      submitButton.hidden = true;
      retryButton.focus();
    }
  });
  retryButton.addEventListener("click", () => {
    form.reset();
    renderPassed();
    options.querySelector("input")?.focus();
  });

  return {
    dialog,
    isOpen: barrier.isOpen,
    close: barrier.close,
    open(id) {
      const next = progress.getQuestion(id);
      if (barrier.isOpen() || !next) return false;
      question = next;
      dialog.querySelector("h2").textContent = question.title ? `${question.id} · ${question.title}` : question.id;
      dialog.querySelector(".education-kicker").textContent = progress.mode === "assignment"
        ? `Engineering lab · ${progress.unitId}` : "Engineering lab · synthetic demo";
      dialog.querySelector("#education-demo-note").textContent = progress.mode === "assignment"
        ? "Choose one answer. Progress lasts for this visit." : "Practice questions only. Progress lasts for this visit.";
      dialog.querySelector("legend").textContent = question.prompt || "Choose one answer.";
      options.replaceChildren(...question.options.map((text, index) => {
        const label = document.createElement("label");
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "answer";
        input.value = String(index);
        input.required = true;
        const copy = document.createElement("span");
        copy.textContent = `${String.fromCharCode(65 + index)}. ${text}`;
        label.append(input, copy);
        return label;
      }));
      renderPassed();
      const opened = barrier.open();
      closeButton.textContent = barrier.canResume() ? "Close & Resume" : "Close";
      return opened;
    },
    destroy() { unsubscribe?.(); barrier.destroy(); },
  };
}
