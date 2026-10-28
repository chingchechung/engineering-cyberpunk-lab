"""Run a validation entry point with CP950 defaults and Python UTF-8 mode off.

The file-I/O shim also handles pathlib's explicit 'locale' sentinel. This makes
the Windows failure reproducible on Linux and on Windows runners with other ACPs.
It does not override callers that explicitly select UTF-8.
"""
import builtins
import io
import locale
from pathlib import Path
import runpy
import sys
import tempfile

assert not sys.flags.utf8_mode, "Launch with -X utf8=0"
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
native_open = builtins.open


def cp950_open(file, mode='r', buffering=-1, encoding=None, errors=None,
               newline=None, closefd=True, opener=None):
    if 'b' not in mode and encoding in (None, 'locale'):
        encoding = 'cp950'
    return native_open(file, mode, buffering, encoding, errors, newline, closefd, opener)


builtins.open = io.open = cp950_open
locale.getencoding = lambda: 'cp950'
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# Negative controls prove the shim exposes the original read/write failures.
with tempfile.TemporaryDirectory(prefix='lab-cp950-probe-') as directory:
    probe = Path(directory) / 'utf8.txt'
    text = 'UTF-8 — 日本語 한글 🧪'
    probe.write_bytes(text.encode('utf-8'))
    try:
        decoded = probe.read_text()  # Deliberately use the simulated default.
    except UnicodeDecodeError:
        pass
    else:
        assert decoded != text, 'Implicit reads unexpectedly used UTF-8'
    try:
        probe.write_text('한글')  # Deliberately unrepresentable in CP950.
    except UnicodeEncodeError:
        pass
    else:
        raise AssertionError('Implicit writes unexpectedly used UTF-8')

target = sys.argv.pop(1)
if target == '-m':
    runpy.run_module(sys.argv.pop(1), run_name='__main__', alter_sys=True)
else:
    target = str(Path(target).resolve())
    sys.argv[0] = target
    sys.path.insert(0, str(Path(target).parent))
    runpy.run_path(target, run_name='__main__')
