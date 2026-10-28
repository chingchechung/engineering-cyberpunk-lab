const BLOCKED_EVENTS = ["pointerdown", "pointerup", "pointermove", "pointercancel", "mousedown", "mouseup", "mousemove", "click", "dblclick", "contextmenu", "wheel", "touchstart", "touchmove", "touchend", "keydown", "keyup", "keypress"];

// Phase 1 native-dialog input/focus barrier, shared by quiz and unit selector.
export function createModalBarrier({ dialog, onOpen, onClose, focusFallback, initialFocus }) {
  const inertState = new Map();
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
    return [...dialog.querySelectorAll("button, input, select, textarea, a[href], [tabindex]")].filter((element) => !element.disabled && !element.hidden && !element.closest("[hidden]"));
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
    if (opened && !dialog.contains(event.target)) initialFocus?.focus();
  }
  window.addEventListener("focusin", containFocus, true);

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

  dialog.addEventListener("cancel", (event) => { event.preventDefault(); close(); });
  dialog.addEventListener("close", () => {
    // A queued close event from an earlier opening must not close a new quiz.
    if (!dialog.open) finishClose();
  });
  return {
    isOpen: () => opened,
    close,
    open() {
      if (opened || document.querySelector("dialog[open]")) return false;
      returnFocus = document.activeElement;
      opened = true;
      onOpen?.();
      isolateBackground();
      observer.observe(document.body, { childList: true });
      dialog.showModal();
      initialFocus?.focus();
      return true;
    },
    destroy() {
      close();
      observer.disconnect();
      for (const type of BLOCKED_EVENTS) {
        window.removeEventListener(type, barrier, true);
        dialog.removeEventListener(type, stopPropagation);
      }
      window.removeEventListener("focusin", containFocus, true);
      dialog.remove();
    },
  };
}
