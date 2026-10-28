import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3, Triangle } from 'three/webgpu';
import { subtractOpening } from '../src/world/matrix/openCityBounds.js';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { GLYPHS, GLYPH_GROUPS, GLYPH_ATLAS, glyphCell, glyphUv, selectColumnGlyphs } from '../src/world/matrix/glyphInventory.js';
import { MATRIX_ZONES, MATRIX_BUDGET, distanceToZone } from '../src/world/matrix/matrixLayout.js';
import { createColumnData } from '../src/world/matrix/createDigitalRain.js';

const area = polygons => polygons.reduce((sum, p) => sum + p.slice(1,-1).reduce((a,v,i) => a + new Triangle(p[0],v,p[i+2]).getArea(),0),0);
const triangle = [[-5,0,-5],[5,0,-5],[0,0,5]].map(v=>new Vector3(...v));
test('localized triangle subtraction preserves all area outside the opening', () => {
  const box = { min:[-1,-1,-1], max:[1,1,1] };
  const retained = subtractOpening(triangle,box);
  assert.ok(Math.abs(area(retained)-46)<1e-8);
  for (const p of retained) for (let i=1;i<p.length-1;i++) {
    const center=new Triangle(p[0],p[i],p[i+1]).getMidpoint(new Vector3());
    assert.ok(center.x<=-1 || center.x>=1 || center.z<=-1 || center.z>=1);
  }
});
test('openings retain unrelated, upper and lower walls and discard only interior', () => {
  for (const y of [-4,4]) assert.ok(Math.abs(area(subtractOpening(triangle.map(v=>v.clone().setY(y)),{min:[-1,-1,-1],max:[1,1,1]}))-50)<1e-8);
  assert.ok(Math.abs(area(subtractOpening(triangle,{min:[10,-1,10],max:[11,1,11]}))-50)<1e-8);
  assert.equal(area(subtractOpening(triangle,{min:[-10,-1,-10],max:[10,1,10]})),0);
});
test('inventory contains unique real Unicode characters in all four categories', () => {
  assert.equal(GLYPHS.length,96);assert.equal(new Set(GLYPHS.map(g=>g.character)).size,96);
  const scripts={english:/^[A-Z]$/u,numbers:/^[0-9+\-=<>*]$/u,japanese:/^[\p{Script=Hiragana}\p{Script=Katakana}]$/u,korean:/^\p{Script=Hangul}$/u};
  assert.deepEqual(GLYPH_GROUPS.map(g=>g.id),Object.keys(scripts));
  for(const g of GLYPHS){assert.equal(Array.from(g.character).length,1);assert.match(g.character,scripts[g.category]);}
});
test('seeded columns mix four groups with exact full-slot weights and varied text', () => {
  const sequences=new Set(),visibleTotals={english:0,numbers:0,japanese:0,korean:0};let visibleCount=0;
  for(const [zoneIndex,zone] of MATRIX_ZONES.entries())for(const [column,data] of createColumnData(zone,zoneIndex+41).entries()) {
    const sequence=selectColumnGlyphs(zoneIndex+41,column);
    assert.deepEqual(sequence,selectColumnGlyphs(zoneIndex+41,column));
    assert.equal(sequence.length,20);assert.equal(new Set(sequence).size,20);
    const count=Object.fromEntries(GLYPH_GROUPS.map(g=>[g.id,0]));
    for(const index of sequence) {assert.ok(index>=0&&index<96);count[GLYPHS[index].category]++;}
    assert.deepEqual(Object.values(count),[5,4,6,5]);
    const visible=sequence.slice(0,data[4]);assert.equal(new Set(visible.map(i=>GLYPHS[i].category)).size,4);
    for(const index of visible){visibleTotals[GLYPHS[index].category]++;visibleCount++;}
    sequences.add(sequence.join(','));
  }
  assert.equal(sequences.size,512);
  for(const group of GLYPH_GROUPS)assert.ok(Math.abs(visibleTotals[group.id]/visibleCount-group.slots/20)<.025);
  assert.notDeepEqual(selectColumnGlyphs(41,0),selectColumnGlyphs(42,0));
});
test('all atlas cells and upright UV mappings are distinct, padded and in range', () => {
  assert.equal(GLYPH_ATLAS.columns*GLYPH_ATLAS.rows,96);
  assert.equal(MATRIX_BUDGET.atlasCells,GLYPHS.length);
  const cells=new Set();
  for(let i=0;i<96;i++) {
    const cell=glyphCell(i);cells.add([cell.x,cell.y].join(','));
    assert.equal(cell.width/cell.height,2/3);assert.ok(GLYPH_ATLAS.padding>=6);
    assert.deepEqual(glyphUv(i,0,1),[cell.x/768,cell.y/768]);
    for(const u of [0,.5,1])for(const v of [0,.5,1])for(const value of glyphUv(i,u,v))assert.ok(value>=0&&value<=1);
  }
  assert.equal(cells.size,96);
  for(const i of [-1,96,NaN,1.5])assert.throws(()=>glyphCell(i),RangeError);
});
test('bundled licensed font matches independently inspected cmap coverage', () => {
  const bytes=readFileSync(new URL('../src/world/matrix/fonts/lab-matrix-text.woff2',import.meta.url));
  const coverage=JSON.parse(readFileSync(new URL('./fixtures/matrix-font-coverage.json',import.meta.url)));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),coverage.sha256);
  assert.deepEqual(coverage.characters.map(g=>g.character),GLYPHS.map(g=>g.character));
  assert.equal(new Set(coverage.characters.map(g=>g.glyph)).size,96);
  assert.ok(coverage.characters.every(g=>g.glyph!=='.notdef'));
  assert.match(readFileSync(new URL('../public/licenses/matrix-text/OFL.txt',import.meta.url),'utf8'),/SIL OPEN FONT LICENSE Version 1.1/);
});
test('two finite plazas have bounded deterministic GPU instances and varied trails/speeds', () => {
  assert.equal(MATRIX_ZONES.length,2);
  assert.equal(MATRIX_BUDGET.columnsPerZone*MATRIX_BUDGET.glyphsPerColumn*2,10240);
  for(const [i,z] of MATRIX_ZONES.entries()) {
    const columns=createColumnData(z,i+41);assert.equal(columns.length,256);
    assert.deepEqual(columns,createColumnData(z,i+41));
    assert.ok(new Set(columns.map(c=>c[4])).size>8);
    for(const [x,zz,phase,speed,length] of columns) {
      assert.ok(Number.isFinite(x+zz+phase+speed+length));assert.ok(speed>=1.8&&speed<=5.2);assert.ok(length>=8&&length<=20);
      assert.ok(distanceToZone(x,zz,z)<1.1);
    }
    assert.equal(distanceToZone(...z.plaza,z),0);
    assert.ok(distanceToZone(1000,1000,z)>500);
  }
});
