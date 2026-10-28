import * as THREE from 'three/webgpu';
import { cameraPosition, color, max, mix, positionWorld, uniform } from 'three/tsl';
import { MATRIX_ZONES, MATRIX_GROUND_Y, MATRIX_BUDGET, distanceToZone } from './matrixLayout.js';
import { createGlyphAtlas } from './glyphAtlas.js';
import { createDigitalRain } from './createDigitalRain.js';
import { openCityBounds } from './openCityBounds.js';
import { buildModelBvh } from '../bvh.js';

function groundMaterial(zone, clock) {
  const material = new THREE.MeshBasicNodeMaterial();
  const gridCell = positionWorld.xz.mul(.5).fract().sub(.5).abs();
  const line = max(gridCell.x, gridCell.y).smoothstep(.474, .495);
  const gateDepth = positionWorld.x.sub(zone.entrance[0]).mul(zone.outward[0])
    .add(positionWorld.z.sub(zone.entrance[1]).mul(zone.outward[1]));
  const transition = gateDepth.smoothstep(0, 12);
  const distanceFade = positionWorld.distance(cameraPosition).smoothstep(12, 48).oneMinus();
  const outwardX = positionWorld.x.sub(zone.plaza[0]).mul(zone.id === 'west' ? -1 : 1);
  const sideDistance = positionWorld.z.sub(zone.plaza[1]).abs();
  const sideFade = sideDistance.smoothstep(14, 21).oneMinus();
  const endFade = outwardX.smoothstep(14, 21).oneMinus();
  const entranceFade = max(outwardX.smoothstep(-22, -15), sideDistance.smoothstep(2.8, 5.8).oneMinus());
  const perimeterFade = sideFade.mul(endFade).mul(entranceFade);
  const pulse = positionWorld.x.mul(.13).add(positionWorld.z.mul(.13)).sub(clock.mul(.45)).sin().mul(.12).add(.88);
  material.colorNode = mix(color(0x010705), color(0x107438), line.mul(distanceFade).mul(perimeterFade).mul(pulse).mul(.55));
  material.opacityNode = transition;
  material.transparent = true;
  material.depthWrite = false;
  material.side = THREE.DoubleSide;
  material.toneMapped = false;
  return material;
}

export function createMatrixExtension({ scene, boundsCollider, colliders = null, zones = MATRIX_ZONES } = {}) {
  const group = new THREE.Group(); group.name = 'MatrixExtension';
  const ground = new THREE.Group(); ground.name = 'MatrixGround';
  const effectsGroup = new THREE.Group(); effectsGroup.name = 'MatrixAtmosphere';
  const collider = new THREE.Group(); collider.name = 'MatrixOuterBounds'; collider.visible = false;
  colliders?.push(collider);
  group.add(ground, effectsGroup, collider); scene.add(group);
  const openings = openCityBounds(boundsCollider, zones);
  const atlas = createGlyphAtlas(), clock = uniform(0), resources = [];
  const wallGeometry = new THREE.BoxGeometry(1, 8, .2);
  const wallMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, visible: false });
  const entries = zones.map((zone, index) => {
    const shape = new THREE.Shape(zone.outline.map(([x,z]) => new THREE.Vector2(x, -z)));
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI / 2); geometry.translate(0, MATRIX_GROUND_Y, 0);
    const material = groundMaterial(zone, clock), mesh = new THREE.Mesh(geometry, material);
    mesh.name = `matrix-${zone.id}-ground`; mesh.renderOrder = 2;
    ground.add(mesh); resources.push(geometry, material);
    // Every perimeter segment except the closing entrance edge remains solid.
    for (let i = 0; i < zone.outline.length - 1; i++) {
      const [ax,az] = zone.outline[i], [bx,bz] = zone.outline[i+1];
      const wall = new THREE.Mesh(wallGeometry, wallMaterial);
      wall.position.set((ax+bx)/2, MATRIX_GROUND_Y+3.9, (az+bz)/2);
      wall.rotation.y = -Math.atan2(bz-az, bx-ax);
      wall.scale.x = Math.hypot(bx-ax,bz-az)+.2; collider.add(wall);
    }
    const effect = new THREE.Group(); effect.name = `matrix-${zone.id}-atmosphere`;
    const rain = createDigitalRain(zone, atlas, clock, index + 41); effect.add(rain.mesh);
    // Three dark distant plaza sides, with an open city-facing side. Local only:
    // never change scene fog, sky, environment map, weather or post parameters.
    const backMaterial = new THREE.MeshBasicNodeMaterial();
    backMaterial.colorNode = color(0x000402);
    backMaterial.side = THREE.DoubleSide;
    backMaterial.transparent = true; backMaterial.depthWrite = false;
    backMaterial.opacityNode = positionWorld.distance(cameraPosition).smoothstep(50, 70).oneMinus();
    const direction = zone.id === 'west' ? -1 : 1;
    const walls = [
      [zone.plaza[0]+direction*23, zone.plaza[1], 46, Math.PI/2],
      [zone.plaza[0], zone.plaza[1]-23, 46, 0],
      [zone.plaza[0], zone.plaza[1]+23, 46, 0],
    ];
    for (const [x,z,width,rotation] of walls) {
      const panelGeometry = new THREE.PlaneGeometry(width, 48);
      const panel = new THREE.Mesh(panelGeometry, backMaterial);
      panel.position.set(x, MATRIX_GROUND_Y+22, z); panel.rotation.y = rotation;
      effect.add(panel); resources.push(panelGeometry);
    }
    effectsGroup.add(effect); resources.push(backMaterial);
    return { zone, mesh, effect, rain };
  });
  group.updateMatrixWorld(true); buildModelBvh(collider);
  let disposed = false;
  function update(delta, camera) {
    if (disposed) return;
    if (Number.isFinite(delta) && delta > 0) clock.value += Math.min(delta, .1);
    if (camera) for (const entry of entries) {
      entry.effect.visible = distanceToZone(camera.position.x, camera.position.z, entry.zone) < MATRIX_BUDGET.fadeFar;
    }
  }
  function dispose() {
    if (disposed) return;
    disposed = true; scene.remove(group); ground.removeFromParent(); openings.dispose();
    const colliderIndex = colliders?.indexOf(collider) ?? -1;
    if (colliderIndex >= 0) colliders.splice(colliderIndex, 1);
    for (const entry of entries) entry.rain.dispose();
    for (const resource of resources) resource.dispose();
    wallGeometry.disposeBoundsTree?.(); wallGeometry.dispose(); wallMaterial.dispose(); atlas.dispose();
  }
  return { group, ground, effectsGroup, collider, entries, atlas, clock, openings, update, dispose };
}
