export function createWalkInputFacade(walkControls) {
  if (!walkControls) {
    return null;
  }

  return {
    isActive: () => walkControls.isActive(),
    isMoving: () => walkControls.isMoving(),
    setMoveAxes: (...args) => walkControls.setMoveAxes(...args),
    subscribe: (listener) => walkControls.subscribe(listener),
    hasTouchLooked: () => walkControls.hasTouchLooked?.() ?? false,
    getInputMethod: () => walkControls.getInputMethod(),
    setInputMethod: (method) => walkControls.setInputMethod(method),
    requestPointerLock: () => walkControls.requestPointerLock?.(),
    exitPointerLock: () => walkControls.exitPointerLock?.(),
  };
}
