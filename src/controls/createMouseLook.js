// No smoothing queue: idle, blur, and modal transitions cannot replay input.
export const MAX_PITCH = (80 * Math.PI) / 180;
export const MAX_MOUSE_DELTA = 180;
export const POINTER_LOCK_SETTLE_MS = 80;
const MAX_ANGULAR_STEP = 0.12;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function isReasonableLookDelta(x, y) {
  return Number.isFinite(x) && Number.isFinite(y) &&
    Math.abs(x) <= MAX_MOUSE_DELTA && Math.abs(y) <= MAX_MOUSE_DELTA;
}

export function createMouseLook({ sensitivity = 0.002 } = {}) {
  let yaw = 0;
  let pitch = 0;
  let horizontalOnly = false;
  let locked = false;
  let acceptAfter = Infinity;
  let discardNext = true;

  function sync(nextYaw, nextPitch) {
    if (!Number.isFinite(nextYaw) || !Number.isFinite(nextPitch)) return;
    yaw = Math.atan2(Math.sin(nextYaw), Math.cos(nextYaw));
    pitch = horizontalOnly ? 0 : clamp(nextPitch, -MAX_PITCH, MAX_PITCH);
  }

  function apply(x, y) {
    if (!isReasonableLookDelta(x, y) || (x === 0 && y === 0)) return false;
    sync(yaw - clamp(x * sensitivity, -MAX_ANGULAR_STEP, MAX_ANGULAR_STEP),
      pitch - (horizontalOnly ? 0 : clamp(y * sensitivity, -MAX_ANGULAR_STEP, MAX_ANGULAR_STEP)));
    return true;
  }

  return {
    sync,
    apply,
    getAngles: () => ({ yaw, pitch }),
    isHorizontalOnly: () => horizontalOnly,
    level: () => { pitch = 0; },
    toggleHorizontalOnly() {
      horizontalOnly = !horizontalOnly;
      pitch = 0;
      return horizontalOnly;
    },
    setLocked(value, now = performance.now()) {
      locked = Boolean(value);
      acceptAfter = locked ? now + POINTER_LOCK_SETTLE_MS : Infinity;
      discardNext = true;
    },
    applyMouse(x, y, now = performance.now()) {
      if (!locked) return false;
      // Discard the first event even when it arrives after the settling period.
      if (discardNext) {
        discardNext = false;
        return false;
      }
      if (now < acceptAfter) return false;
      return apply(x, y);
    },
  };
}
