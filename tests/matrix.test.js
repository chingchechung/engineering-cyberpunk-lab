import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3, Triangle } from 'three/webgpu';
import { subtractOpening } from '../src/world/matrix/openCityBounds.js';
import { glyphPixels } from '../src/world/matrix/glyphAtlas.js';
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
test('glyph atlas is deterministic original bitmap data with transparent negative space', () => {
  const a=glyphPixels(),b=glyphPixels();assert.deepEqual(a,b);
  assert.equal(a.data.byteLength,64*96*4);
  const cells=new Set();
  for(let g=0;g<64;g++) {let bits='';for(let y=0;y<12;y++)for(let x=0;x<8;x++)bits+=a.data[(((g>>3)*12+y)*64+(g%8)*8+x)*4+3]?'1':'0';cells.add(bits);}
  assert.equal(cells.size,64);
  assert.ok(a.data.filter(v=>v===0).length>a.data.length/2);
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
