"""Strict static-output checks shared by local packaging and CI. No network."""
import hashlib
import json
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
HASHED=re.compile(r'assets/[A-Za-z0-9_.-]+-[A-Za-z0-9_-]{8,}\.(?:js|css|woff2|wasm)$')

def normalized_base(base):
    if not re.fullmatch(r'/(?:[A-Za-z0-9_~.-]+/)*',base) or any(x in ['.','..'] for x in base.split('/')):
        raise ValueError('Use an absolute URL path with a trailing slash, e.g. /course/cyberpunk-lab/')
    return base

def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def verify_dist(directory,base):
    directory=Path(directory).resolve();base=normalized_base(base)
    expected={p.relative_to(ROOT/'public').as_posix():p for p in (ROOT/'public').rglob('*') if p.is_file()}
    expected.update({name:ROOT/source for name,source in json.loads((ROOT/'config/runtime-notices.json').read_text(encoding="utf-8")).items()})
    expected['index.html']=None
    files={p.relative_to(directory).as_posix():p for p in directory.rglob('*') if p.is_file()}
    assert directory.is_dir() and files,'Missing build output'
    assert not any(p.is_symlink() for p in directory.rglob('*')),'Symlinks are not allowed in release candidates'
    assert set(expected)<=set(files),f'Missing output: {set(expected)-set(files)}'
    assert all(name in expected or HASHED.fullmatch(name) for name in files),f'Unexpected output files: {set(files)-set(expected)-{n for n in files if HASHED.fullmatch(n)}}'
    for name,source in expected.items():
        if source:assert digest(files[name])==digest(source),f'Changed/missing public asset or license: {name}'
    baseline=json.loads((ROOT/'docs/assets-inventory.json').read_text(encoding="utf-8"))
    for asset in baseline['assets']:assert digest(files[asset['path'].removeprefix('public/')])==asset['sha256'],asset['path']
    assert json.loads(files['assignments/manifest.json'].read_text(encoding="utf-8"))=={'schemaVersion':1,'units':[]},'Default manifest must be empty'
    assert {n for n in files if n.startswith('assignments/')}=={'assignments/manifest.json'},'Course/fixture JSON is forbidden'
    html=files['index.html'].read_text(encoding="utf-8")
    assert '<title>Engineering Cyberpunk Lab</title>' in html
    assert 'noindex, nofollow' in html and 'Anderson Mancini' in html and 'Sunag' in html
    assert 'threejspunk.vercel.app' not in html and 'rel="canonical"' not in html
    entries=re.findall(r'(?:src|href)="([^"#]+)"',html)
    for entry in entries:
        if entry.startswith('data:'):continue
        assert entry.startswith(base),f'Entry escapes base: {entry}'
        assert entry[len(base):] in files,f'Missing entry: {entry}'
    decoder_hashes={digest(p) for p in (ROOT/'node_modules/three/examples/jsm/libs').rglob('*.wasm')}
    for name,p in files.items():
        if name.startswith('assets/') and p.suffix=='.wasm':assert digest(p) in decoder_hashes,'Unexpected decoder binary'
    font=ROOT/'src/world/matrix/fonts/lab-matrix-text.woff2'
    assert any(p.suffix=='.woff2' and digest(p)==digest(font) for n,p in files.items() if n.startswith('assets/')),'Matrix font missing'
    forbidden=['TEST ONLY','contract-corpus','terminal-survey.json','matrix-font-coverage.json','BEGIN PRIVATE KEY','BEGIN RSA PRIVATE KEY','BEGIN OPENSSH PRIVATE KEY']
    # Source-map/dev/environment files cannot enter through the path allowlist.
    # Scan textual bundles for fixture markers and high-confidence secret forms.
    for name,p in files.items():
        if name=='index.html' or HASHED.fullmatch(name) and p.suffix in ['.js','.css']:
            text=p.read_text(encoding="utf-8")
            assert not any(marker in text for marker in forbidden),f'Test/private marker in {name}'
            assert not re.search(r'(?<![A-Za-z0-9])(?:AKIA|ASIA)[A-Z0-9]{16}|gh[pousr]_[A-Za-z0-9]{30,}',text),f'Possible credential in {name}'
    return {'base':base,'files':len(files),'originalPublicHashes':len(baseline['assets']),
            'manifestEmpty':True,'matrixFontBytes':font.stat().st_size,
            'inventory':[{'path':name,'bytes':p.stat().st_size,'sha256':digest(p)} for name,p in sorted(files.items())]}
