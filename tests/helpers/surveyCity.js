import { Vector3, Box3, Raycaster } from "three/webgpu";

// Test-only survey. Every graph edge is traversed by the production controller;
// the graph is a conservative 2 m sampling, not a replacement collision engine.
export async function surveyCity(app, onProgress = () => {}) {
  const { camera, director, geometry, world } = app;
  app.education.destroy(); // Survey the original city/car, without old kiosks.
  const walk = director.walkControls;
  const start = camera.position.clone();
  const bounds = new Box3().setFromObject(geometry.bounds);
  const spacing = 2;
  const key = (i, j) => `${i},${j}`;
  const nodes = [{ i: 0, j: 0, position: start.toArray(), parent: -1, edges: [] }];
  const known = new Map([[key(0, 0), 0]]);
  const failed = new Set();
  const ray = new Raycaster();
  const direction = new Vector3();
  let testedEdges = 0;

  function travel(from, x, z) {
    camera.position.fromArray(from);
    walk.clearInput();
    camera.lookAt(x, camera.position.y, z);
    walk.syncEulerFromCamera();
    let stalled = 0;
    for (let frame = 0; frame < 90; frame++) {
      const distance = Math.hypot(camera.position.x - x, camera.position.z - z);
      if (distance < 0.18) { walk.clearInput(); return camera.position.y; }
      const before = camera.position.clone();
      walk.setMoveAxes(0, -1);
      director.update(1 / 30);
      if (camera.position.distanceToSquared(before) < 1e-8) stalled++;
      else stalled = 0;
      if (stalled > 8) break;
    }
    walk.clearInput();
    return null;
  }

  for (let cursor = 0; cursor < nodes.length; cursor++) {
    const node = nodes[cursor];
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const i = node.i + di, j = node.j + dj;
      const x = start.x + i * spacing, z = start.z + j * spacing;
      if (x < bounds.min.x + 0.7 || x > bounds.max.x - 0.7 || z < bounds.min.z + 0.7 || z > bounds.max.z - 0.7) continue;
      const targetKey = key(i, j), edgeKey = `${cursor}:${targetKey}`;
      const existing = known.get(targetKey);
      if (existing !== undefined && node.edges.includes(existing)) continue;
      if (failed.has(edgeKey)) continue;
      testedEdges++;
      const y = travel(node.position, x, z);
      if (y === null) { failed.add(edgeKey); continue; }
      let index = existing;
      if (index === undefined) {
        index = nodes.length;
        // Exact graph centers are at most 18 cm from the tested endpoint.
        nodes.push({ i, j, position: [x, y, z], parent: cursor, edges: [] });
        known.set(targetKey, index);
      }
      if (Math.abs(nodes[index].position[1] - y) > 0.2) continue;
      node.edges.push(index);
      // Reverse movement is checked when the target is processed.
    }
    if (cursor % 100 === 0) {
      onProgress({ processed: cursor, discovered: nodes.length, testedEdges });
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  function clearSite(position) {
    const [x, eyeY, z] = position;
    const floor = eyeY - walk.settings.eyeHeight;
    // Keep sites on the original street-level ground, rather than reachable roofs.
    if (Math.abs(floor + 5.4) > 0.08) return false;
    for (const [dx, dz] of [[0, 0], [-0.3, -0.3], [-0.3, 0.3], [0.3, -0.3], [0.3, 0.3]]) {
      ray.set(new Vector3(x + dx, floor + 0.08, z + dz), new Vector3(0, -1, 0));
      ray.far = 0.18;
      if (!ray.intersectObjects([world.city, world.ground.mesh], true).length) return false;
    }
    for (const height of [0.3, 1, 1.8, 2.3]) for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      direction.set(Math.cos(angle), 0, Math.sin(angle));
      ray.set(new Vector3(x, floor + height, z), direction);
      ray.far = 1.1;
      if (ray.intersectObjects(world.colliders, true).length) return false;
    }
    ray.set(new Vector3(x, floor + 0.05, z), new Vector3(0, 1, 0));
    ray.far = 2.5;
    return !ray.intersectObjects(world.colliders, true).length;
  }
  const candidates = nodes.flatMap((node, index) => clearSite(node.position) ? [index] : []);
  function distances(source) {
    const distance = new Array(nodes.length).fill(Infinity);
    distance[source] = 0;
    const queue = [source];
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const index = queue[cursor];
      for (const target of nodes[index].edges) if (distance[target] === Infinity) {
        distance[target] = distance[index] + spacing;
        queue.push(target);
      }
    }
    return distance;
  }
  const selected = [];
  let minDistance = distances(0);
  for (let count = 0; count < 5; count++) {
    const next = candidates.filter((index) => !selected.includes(index) && Number.isFinite(minDistance[index]))
      .reduce((best, index) => minDistance[index] > minDistance[best] ? index : best);
    selected.push(next);
    const current = distances(next);
    // Spawn seeds the first choice only; it is not a sixth virtual terminal.
    minDistance = count === 0 ? current : minDistance.map((value, index) => Math.min(value, current[index]));
  }
  return { spacing, start: start.toArray(), bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
    nodes, candidates, selected, testedEdges };
}
