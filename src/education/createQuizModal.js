const BLOCKED_EVENTS = ["pointerdown", "pointerup", "pointermove", "pointercancel", "mousedown", "mouseup", "mousemove", "click", "dblclick", "contextmenu", "wheel", "touchstart", "touchmove", "touchend", "keydown", "keyup", "keypress"];

export function createQuizModal({ progress, onOpen, onClose, onProgress, focusFallback }) {
  const dialog = document.createElement("dialog");
  dialog.className = "education-quiz";
  dialog.setAttribute("aria-labelledby", "education-question-title");
  dialog.setAttribute("aria-describedby", "education-demo-note");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("data-ui-block-look", "true");
  dialog.innerHTML = `
    <header><p class="education-kicker">Engineering lab · synthetic demo</p>
      <button type="button" data-close aria-label="Close question">Close</button></header>
    <h2 id="education-question-title"></h2>
    <p id="education-demo-note">Practice questions only. Progress lasts for this visit.</p>
    <form><fieldset><legend></legend><div data-options></div></fieldset>
      <p data-feedback role="status" aria-live="polite"></p>
      <button type="submit">Check answer</button>
      <button type="button" data-retry hidden>Try again</button>
    </form>
    <p class="education-resume">Close, then click the city to resume mouse look. Escape also closes this question.</p>`;
  document.body.append(dialog);
  const closeButton = dialog.querySelector("[data-close]");
  const form = dialog.querySelector("form");
  const options = dialog.querySelector("[data-options]");
  const feedback = dialog.querySelector("[data-feedback]");
  const submitButton = dialog.querySelector("[type=submit]");
  const retryButton = dialog.querySelector("[data-retry]");
  const inertState = new Map();
  let question = null;
  let returnFocus = null;
  let opened = false;

  function isolateBackground() {
    for (const element of document.body.children) {
      if (element === dialog || inertState.has(element)) continue;
      inertState.set(element, element.inert);
      element.inert = true;
    }
  }
  const observer = new MutationObserver(isolateBackground);

  function focusableElements() {
    return [...dialog.querySelectorAll("button, input")].filter((element) => !element.disabled && !element.hidden && !element.closest("[hidden]"));
  }

  function barrier(event) {
    if (!opened) return;
    if (event.type === "keydown" && event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
      return;
    }
    if (event.type === "keydown" && event.key === "Tab") {
      event.preventDefault();
      event.stopImmediatePropagation();
      const elements = focusableElements();
      const index = elements.indexOf(document.activeElement);
      const step = event.shiftKey ? -1 : 1;
      elements[(index + step + elements.length) % elements.length]?.focus();
      return;
    }
    if (!dialog.contains(event.target)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  // Capture outside events before document/window shortcuts. Inside events reach
  // their controls, then stop at the dialog instead of reaching global handlers.
  const stopPropagation = (event) => event.stopPropagation();
  for (const type of BLOCKED_EVENTS) {
    window.addEventListener(type, barrier, { capture: true, passive: false });
    dialog.addEventListener(type, stopPropagation);
  }
  function containFocus(event) {
    if (opened && !dialog.contains(event.target)) closeButton.focus();
  }
  window.addEventListener("focusin", containFocus, true);

  function renderPassed() {
    const passed = progress.hasPassed(question.id);
    for (const input of options.querySelectorAll("input")) input.disabled = passed;
    submitButton.hidden = passed;
    retryButton.hidden = true;
    feedback.textContent = passed ? "Correct. This question is passed." : "";
  }

  function finishClose() {
    if (!opened) return;
    opened = false;
    observer.disconnect();
    for (const [element, wasInert] of inertState) element.inert = wasInert;
    inertState.clear();
    onClose?.();
    const target = returnFocus?.isConnected &&
      returnFocus.matches("button, a[href], input, select, textarea, [tabindex]") &&
      !returnFocus.disabled && !returnFocus.closest("[inert]") && returnFocus.getClientRects().length
      ? returnFocus : focusFallback;
    target?.focus({ preventScroll: true });
  }

  function close() {
    if (!opened) return;
    dialog.close();
    finishClose();
  }

  closeButton.addEventListener("click", close);
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); close(); });
  dialog.addEventListener("close", () => {
    // A queued close event from an earlier opening must not close a new quiz.
    if (!dialog.open) finishClose();
  });
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
    isOpen: () => opened,
    close,
    open(id) {
      const next = progress.getQuestion(id);
      if (opened || !next) return false;
      question = next;
      returnFocus = document.activeElement;
      dialog.querySelector("h2").textContent = question.id;
      dialog.querySelector("legend").textContent = question.prompt;
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
      opened = true;
      onOpen?.();
      isolateBackground();
      observer.observe(document.body, { childList: true });
      dialog.showModal();
      closeButton.focus();
      return true;
    },
    destroy() {
      close();
      observer.disconnect();
      for (const type of BLOCKED_EVENTS) window.removeEventListener(type, barrier, true);
      window.removeEventListener("focusin", containFocus, true);
      dialog.remove();
    },
  };
}
