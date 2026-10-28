import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three/webgpu';
import { buildModelBvh } from '../bvh.js';

// Subtract boxes from triangles, rather than dropping whole faces/meshes. Each
// original triangle is partitioned by the six box planes; only the interior is
// discarded. World-space clipping preserves transforms and all other walls.
function split(polygon, axis, value, sign) {
  const inside = [], outside = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const da = (a[axis] - value) * sign, db = (b[axis] - value) * sign;
    (da >= 0 ? inside : outside).push(a);
    if ((da > 0 && db < 0) || (da < 0 && db > 0)) {
      const point = a.clone().lerp(b, da / (da - db));
      inside.push(point); outside.push(point);
    }
  }
  return { inside, outside };
}

export function subtractOpening(triangle, box) {
  let remainder = triangle;
  const retained = [];
  for (const [axis, value, sign] of [
    ['x', box.min[0], 1], ['x', box.max[0], -1],
    ['y', box.min[1], 1], ['y', box.max[1], -1],
    ['z', box.min[2], 1], ['z', box.max[2], -1],
  ]) {
    if (remainder.length < 3) break;
    const parts = split(remainder, axis, value, sign);
    if (parts.outside.length >= 3) retained.push(parts.outside);
    remainder = parts.inside;
  }
  return retained;
}

export function openCityBounds(root, zones) {
  const replacements = [];
  root.updateMatrixWorld(true);
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    const original = mesh.geometry, positions = original.attributes.position, index = original.index;
    const inverse = mesh.matrixWorld.clone().invert(), vertices = [];
    for (let i = 0; i < (index?.count ?? positions.count); i += 3) {
      let polygons = [Array.from({ length: 3 }, (_, j) => new Vector3()
        .fromBufferAttribute(positions, index ? index.getX(i + j) : i + j).applyMatrix4(mesh.matrixWorld))];
      for (const zone of zones) polygons = polygons.flatMap(poly => {
        const parts = [];
        for (let j = 1; j < poly.length - 1; j++) parts.push(...subtractOpening([poly[0], poly[j], poly[j + 1]], zone.opening));
        return parts;
      });
      for (const poly of polygons) for (let j = 1; j < poly.length - 1; j++) {
        for (const point of [poly[0], poly[j], poly[j + 1]]) vertices.push(...point.clone().applyMatrix4(inverse).toArray());
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    mesh.geometry = geometry;
    replacements.push({ mesh, original, geometry });
  });
  buildModelBvh(root);
  let disposed = false;
  return {
    replacements,
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const { mesh, original, geometry } of replacements) {
        mesh.geometry = original;
        geometry.disposeBoundsTree?.(); geometry.dispose();
      }
    },
  };
}
