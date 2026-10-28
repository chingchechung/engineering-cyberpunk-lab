#!/usr/bin/env python3
"""Generate the Phase 3.5 coordinate diagram from runtime layout + old survey."""
import html
import json
from pathlib import Path
import subprocess

ROOT=Path(__file__).resolve().parents[1]
zones=json.loads(subprocess.check_output(['node','--input-type=module','-e',
    "import {MATRIX_ZONES} from './src/world/matrix/matrixLayout.js'; console.log(JSON.stringify(MATRIX_ZONES))"],cwd=ROOT))
survey=json.loads((ROOT/'tests/fixtures/terminal-survey.json').read_text(encoding="utf-8"))
def point(x,z):return ((x+322)*2.3,280-(z+25)*2.3)
def poly(points):return ' '.join('%.1f,%.1f'%point(x,z) for x,z in points)
svg=['<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="390" viewBox="0 0 1240 390" role="img" aria-labelledby="title desc">',
 '<title id="title">Original street and two Matrix extensions in world X/Z metres</title>',
 '<desc id="desc">Grey points sample the accepted reachable street. Green outlines show narrow causeways leading to 44 metre plazas beyond existing buildings. The two real exits bend northwest and southeast. This is geometry evidence, not a rendered view.</desc>',
 '<rect width="1240" height="390" fill="#07100f"/>',
 '<g font-family="sans-serif" font-size="13" fill="#d7e6e1">',
 '<text x="22" y="25" font-size="18">Phase 3.5 · one continuous world · X/Z metres</text>']
for x in range(-300,201,50):
 px,_=point(x,0);svg.extend([f'<path d="M{px:.1f} 45V300" stroke="#19302b"/>',f'<text x="{px:.1f}" y="318" text-anchor="middle">{x}</text>'])
for z in range(-20,81,20):
 _,pz=point(0,z);svg.extend([f'<path d="M18 {pz:.1f}H1220" stroke="#19302b"/>',f'<text x="20" y="{pz-4:.1f}">Z {z}</text>'])
for node in survey['nodes'][::3]:
 x,_,z=node['position'];px,pz=point(x,z);svg.append(f'<circle cx="{px:.1f}" cy="{pz:.1f}" r="1.1" fill="#80918d"/>')
for zone in zones:
 svg.append(f'<polygon points="{poly(zone["outline"])}" fill="#063e29" stroke="#3cd88d" stroke-width="1.5"/>')
 svg.append(f'<polyline points="{poly([zone["entrance"],*zone["route"]])}" fill="none" stroke="#84ffc0" stroke-dasharray="4 3"/>')
 px,pz=point(*zone['plaza']);svg.append(f'<text x="{px:.1f}" y="{pz-8:.1f}" text-anchor="middle">Matrix {zone["id"].title()}</text>')
 svg.append(f'<text x="{px:.1f}" y="{pz+10:.1f}" text-anchor="middle">44 × 44 m</text>')
 ex,ez=point(*zone['entrance']);svg.append(f'<circle cx="{ex:.1f}" cy="{ez:.1f}" r="4" fill="#84ffc0"/>')
 offset=-28 if zone['id']=='west' else 44
 svg.append(f'<text x="{ex:.1f}" y="{ez+offset:.1f}" text-anchor="middle">{html.escape(str(zone["entrance"]))}</text>')
for tid,index in survey['terminalNodes'].items():
 x,_,z=survey['nodes'][index]['position'];px,pz=point(x,z)
 svg.append(f'<circle cx="{px:.1f}" cy="{pz:.1f}" r="3.5" fill="#ffdf24"/><text x="{px+5:.1f}" y="{pz-8:.1f}">{tid}</text>')
px,pz=point(survey['start'][0],survey['start'][2]);svg.append(f'<path d="M{px-4:.1f} {pz:.1f}h8m-4 -4v8" stroke="#fff" stroke-width="2"/>')
svg.extend(['<text x="560" y="105">Accepted street · original spawn and terminals retained</text>',
 '<text x="22" y="352">Grey: 2 m street survey samples · yellow: fixed Q01–Q05 · green: finite new ground and safe perimeter</text>',
 '<text x="22" y="374">Causeways follow building gaps; city assets stay intact. Looking back at each transition remains open. Diagram is not visual acceptance.</text>',
 '</g></svg>'])
(ROOT/'docs/phase-3-5-layout.svg').write_text('\n'.join(svg)+'\n', encoding="utf-8")
