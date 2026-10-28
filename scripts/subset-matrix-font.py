#!/usr/bin/env python3
"""Subset a separately downloaded, pinned Noto source; no network access here.

Requires fontTools[woff]. Run with the pinned Node runtime on PATH.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
args = parser.parse_args()
expected = '68a3fc98800b2a27b371f2fb79991daf3633bd89309d4ffaa6946fd587f375b5'
if hashlib.sha256(args.source.read_bytes()).hexdigest() != expected:
    raise SystemExit('Source font hash mismatch; see public/licenses/matrix-text/NOTICE.txt')
characters = json.loads(subprocess.check_output(['node', '--input-type=module', '-e',
    "import {GLYPHS} from './src/world/matrix/glyphInventory.js'; console.log(JSON.stringify(GLYPHS.map(g=>g.character).join('')))"], cwd=ROOT))
font = TTFont(args.source, recalcTimestamp=False)
cmap = font.getBestCmap()
assert all(ord(c) in cmap and cmap[ord(c)] != '.notdef' for c in characters)
options = subset.Options()
options.hinting = False
options.layout_features = []
options.name_IDs = ['*']
options.name_languages = ['*']
subsetter = subset.Subsetter(options=options)
subsetter.populate(text=characters)
subsetter.subset(font)
# Rename the derivative family; preserve original copyright/license attribution.
renamed = {1: 'Lab Matrix Text', 2: 'Regular', 3: 'LabMatrixText-Regular;UnicodeSubset;1',
           4: 'Lab Matrix Text Regular', 6: 'LabMatrixText-Regular', 16: 'Lab Matrix Text', 17: 'Regular'}
for record in font['name'].names:
    if record.nameID in renamed:
        record.string = renamed[record.nameID].encode(record.getEncoding())
cff = font['CFF '].cff
cff.fontNames[0] = 'LabMatrixText-Regular'
cff.topDictIndex[0].FamilyName = 'Lab Matrix Text'
cff.topDictIndex[0].FullName = 'Lab Matrix Text Regular'
font.flavor = 'woff2'
output = ROOT / 'src/world/matrix/fonts/lab-matrix-text.woff2'
font.save(output)
result = TTFont(output)
assert set(result.getBestCmap()) == {ord(c) for c in characters}
assert len({result.getBestCmap()[ord(c)] for c in characters}) == len(characters)
print(json.dumps({'characters': len(characters), 'bytes': output.stat().st_size,
                  'sha256': hashlib.sha256(output.read_bytes()).hexdigest()}))
