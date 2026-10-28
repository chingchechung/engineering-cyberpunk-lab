#!/usr/bin/env python3
"""Run the five accepted DOM/geometry/text suites against local HTTPS Vite."""
import os,ssl,subprocess,tempfile,time,signal
from pathlib import Path
from urllib.request import urlopen
ROOT=Path(__file__).resolve().parents[1]
work=Path(tempfile.mkdtemp(prefix='engineering-lab-regressions-'))
env={**os.environ,'BROWSER':'none'}
log=open(work/'vite.log','w');process=subprocess.Popen(['npm','run','dev','--','--host','127.0.0.1','--port','5177','--strictPort'],cwd=ROOT,env=env,stdout=log,stderr=log,start_new_session=True)
try:
    public=work/'vite-public.crt';pem=ROOT/'node_modules/.vite/basic-ssl/_cert.pem'
    for _ in range(150):
        if process.poll() is not None:raise RuntimeError((work/'vite.log').read_text())
        if pem.exists():
            subprocess.run(['openssl','x509','-in',str(pem),'-out',str(public)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
            try:
                with urlopen('https://127.0.0.1:5177/tests/harness.html',context=ssl.create_default_context(cafile=str(public)),timeout=1):break
            except Exception:pass
        time.sleep(.1)
    else:raise RuntimeError('HTTPS Vite startup failed')
    for script in ['browser-phase-1.py','browser-phase-2.py','browser-phase-3.py','browser-phase-3-5.py','browser-matrix-text.py']:
        subprocess.run(['python',str(ROOT/'scripts'/script),'--origin','https://127.0.0.1:5177','--cafile',str(public)],cwd=ROOT,check=True)
finally:
    os.killpg(process.pid,signal.SIGTERM)
    try:process.wait(timeout=10)
    except subprocess.TimeoutExpired:process.kill();process.wait()
    log.close()
