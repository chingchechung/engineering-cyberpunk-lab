import * as THREE from 'three/webgpu';
import { attribute, billboarding, cameraPosition, color, float, fract, mix, positionGeometry, texture, uniform, uv, vec2, vec3 } from 'three/tsl';
import { MATRIX_BUDGET, MATRIX_GROUND_Y } from './matrixLayout.js';

function randomGenerator(seed) {
  return () => { seed = Math.imul(seed, 1664525) + 1013904223 >>> 0; return seed / 4294967296; };
}

export function createColumnData(zone, seed) {
  const random = randomGenerator(seed), columns = [];
  // Broad plaza groups, with dark gaps. Keep a clear view back through the neck.
  for (let i = 0; i < 192; i++) {
    const x = zone.plaza[0] + (random() - .5) * 42;
    const z = zone.plaza[1] + (random() - .5) * 42;
    columns.push([x, z, random(), 1.8 + random() * 3.4, 8 + Math.floor(random() * 13)]);
  }
  const route = [zone.entrance, ...zone.route], lengths = [], cumulative = [];
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    lengths.push(Math.hypot(route[i][0] - route[i-1][0], route[i][1] - route[i-1][1]));
    total += lengths.at(-1); cumulative.push(total);
  }
  for (let i = 192; i < MATRIX_BUDGET.columnsPerZone; i++) {
    const distance = (i - 191) / 65 * total;
    let segment = cumulative.findIndex(value => value >= distance);
    segment = Math.max(0, segment);
    const length = lengths[segment], a = route[segment], b = route[segment + 1];
    const t = (distance - (cumulative[segment] - length)) / length;
    const lateral = (i % 2 ? 1 : -1) * (.7 + random() * .3);
    columns.push([a[0] + (b[0]-a[0])*t - (b[1]-a[1])/length*lateral,
      a[1] + (b[1]-a[1])*t + (b[0]-a[0])/length*lateral, random(), 1.8 + random()*3.4, 8 + Math.floor(random()*13)]);
  }
  return columns;
}

export function createDigitalRain(zone, atlas, clock, seed) {
  const columns = createColumnData(zone, seed), parameters = [], glyphs = [];
  columns.forEach(([x, z, phase, speed, length], column) => {
    for (let glyph = 0; glyph < MATRIX_BUDGET.glyphsPerColumn; glyph++) {
      parameters.push(x, z, phase, speed);
      glyphs.push(glyph, length, (column * 31 + glyph * 17 + seed) % 64);
    }
  });
  const base = new THREE.PlaneGeometry(.3, .46);
  const geometry = new THREE.InstancedBufferGeometry().copy(base);
  base.dispose();
  geometry.setAttribute('matrixColumn', new THREE.InstancedBufferAttribute(new Float32Array(parameters), 4));
  geometry.setAttribute('matrixGlyph', new THREE.InstancedBufferAttribute(new Float32Array(glyphs), 3));
  geometry.instanceCount = columns.length * MATRIX_BUDGET.glyphsPerColumn;
  const column = attribute('matrixColumn', 'vec4'), glyph = attribute('matrixGlyph', 'vec3');
  const head = fract(column.z.sub(clock.mul(column.w).div(36)).add(glyph.x.mul(.58 / 36))).mul(36);
  const center = vec3(column.x, head.add(MATRIX_GROUND_Y), column.y);
  const cell = vec2(glyph.z.mod(8), glyph.z.div(8).floor());
  const mask = texture(atlas, uv().add(cell).div(8)).a;
  const trail = float(1).sub(glyph.x.div(glyph.y)).max(0).pow(1.6);
  const distanceFade = center.distance(cameraPosition).smoothstep(24, MATRIX_BUDGET.fadeFar).oneMinus();
  const gateDepth = column.x.sub(zone.entrance[0]).mul(zone.outward[0])
    .add(column.y.sub(zone.entrance[1]).mul(zone.outward[1]));
  const transition = gateDepth.smoothstep(0, 16);
  const heightFade = head.smoothstep(0, 1.2).mul(head.smoothstep(30, 36).oneMinus());
  const material = new THREE.MeshBasicNodeMaterial();
  material.positionNode = positionGeometry;
  material.vertexNode = billboarding({ position: center, horizontal: true, vertical: true });
  material.colorNode = mix(color(0x11c25d), color(0xcaffdc), glyph.x.lessThan(1)).mul(1.7);
  material.opacityNode = mask.mul(trail).mul(distanceFade).mul(transition).mul(heightFade).mul(.78);
  material.transparent = true;
  material.depthWrite = false;
  material.toneMapped = false;
  material.blending = THREE.AdditiveBlending;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `matrix-${zone.id}-digital-rain`;
  // Shader positions are world-space. CPU visibility is bounded by distanceToZone.
  mesh.frustumCulled = false;
  mesh.renderOrder = 10;
  return { mesh, columns, dispose() { geometry.dispose(); material.dispose(); } };
}
