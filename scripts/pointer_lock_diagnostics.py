"""Observe native Pointer Lock without granting permission or synthesizing input."""
import json

from playwright.sync_api import Error


def observe_pointer_lock(page):
    page.evaluate("""() => {
      const events = [];
      const state = () => ({focused:document.hasFocus(), visibility:document.visibilityState,
        locked:document.pointerLockElement===app.canvas,
        activeElement:document.activeElement?.tagName,
        activation:{active:navigator.userActivation.isActive, ever:navigator.userActivation.hasBeenActive},
        suspended:app.director.isInputSuspended(), active:app.director.walkControls.isActive(),
        quizOpen:app.education.modal.isOpen()});
      const record = (type, detail={}) => {
        events.push({type, time:performance.now(), ...state(), ...detail});
        if(events.length>200)events.shift();
      };
      window.pointerLockDiagnostics = () => ({state:state(), events});
      for(const type of ['pointerlockchange','pointerlockerror','visibilitychange'])
        document.addEventListener(type,event=>record(type,{trusted:event.isTrusted}));
      for(const type of ['focus','blur'])window.addEventListener(type,()=>record(type));
      for(const type of ['click','keydown','keyup'])window.addEventListener(type,event=>{
        record(type,{trusted:event.isTrusted,key:event.key,
          target:event.target?.hasAttribute?.('data-close')?'close':event.target?.className});
      },true);
      const nativeRequest = app.canvas.requestPointerLock.bind(app.canvas);
      app.canvas.requestPointerLock = (...args) => {
        record('request');
        try {
          const result = nativeRequest(...args);
          record('return',{result:result?.then?'promise':typeof result});
          result?.then(()=>record('resolved'),error=>record('rejected',{name:error.name,message:error.message}));
          return result;
        } catch(error) {
          record('threw',{name:error.name,message:error.message});
          throw error;
        }
      };
      record('installed');
    }""")


def wait_for_pointer_lock(page, stage, timeout=30000):
    try:
        # Keep the existing deadline; rejection is never accepted as success.
        page.wait_for_function("document.pointerLockElement===app.canvas", timeout=timeout)
    except Error:
        print("FAIL native Pointer Lock: " + json.dumps({
            "stage": stage, "diagnostics": page.evaluate("pointerLockDiagnostics()")
        }), flush=True)
        raise
