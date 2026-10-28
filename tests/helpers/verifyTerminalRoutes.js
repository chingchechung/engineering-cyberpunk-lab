import { Vector3, Raycaster, MeshBasicMaterial, Mesh, BoxGeometry, DoubleSide, Box3, Matrix4 } from "three/webgpu";

// Continuous controller-driven routes: no teleporting between waypoints. Each
// independent route begins at its documented source, then uses only walk input.
export async function verifyTerminalRoutes(app, survey, layout) {
  const { camera, director, world, education } = app;
  const walk = director.walkControls;
  const ray = new Raycaster();
  const ground = world.ground.mesh;
  const cityColliders = world.colliders.filter((object) => !education.terminals.colliders.includes(object));
  const origin = new Vector3(), direction = new Vector3();
  const readings = {};
  for (const terminal of layout) {
    const [x, floor, z] = terminal.position;
    const surveyed = survey.nodes[survey.terminalNodes[terminal.id]].position;
    if (Math.hypot(x - surveyed[0], z - surveyed[2]) > 0.001) throw Error("Unsourced position: " + terminal.id);
    // An enclosing volume includes the rotating label, not just the casing.
    // Bottom padding excludes the intended supported floor contact.
    const envelope = new Box3(new Vector3(x - 0.7, floor + 0.02, z - 0.7), new Vector3(x + 0.7, floor + 2.5, z + 0.7));
    for (const root of cityColliders) root.traverse((mesh) => {
      if (mesh.geometry?.boundsTree?.intersectsBox(envelope, new Matrix4().copy(mesh.matrixWorld).invert())) {
        throw Error("Terminal envelope intersects geometry " + terminal.id + ": " + mesh.name);
      }
    });
    for (const [dx, dz] of [[0, 0], [-0.3, -0.3], [-0.3, 0.3], [0.3, -0.3], [0.3, 0.3]]) {
      ray.set(origin.set(x + dx, floor + 0.1, z + dz), direction.set(0, -1, 0));
      ray.far = 0.2;
      if (!ray.intersectObjects([world.city, ground], true).length) throw Error("Unsupported base " + terminal.id);
    }
    for (const height of [0.3, 1, 1.8, 2.3]) for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      ray.set(origin.set(x, floor + height, z), direction.set(Math.cos(a), 0, Math.sin(a)));
      ray.far = 1.05;
      if (ray.intersectObjects(cityColliders, true).length) throw Error("Blocked terminal clearance " + terminal.id);
    }
    ray.set(origin.set(x, floor + 0.05, z), direction.set(0, 1, 0)); ray.far = 2.5;
    if (ray.intersectObjects(cityColliders, true).length) throw Error("Overhead obstruction " + terminal.id);
    for (const other of layout) if (other !== terminal && Math.hypot(x - other.position[0], z - other.position[2]) < 2.1) throw Error("Terminal overlap");
    const entry = education.terminals.entries.find((entry) => entry.id === terminal.id);
    if (!entry?.label || !entry.indicator || !entry.group.visible || entry.indicator.material.color.getHex() !== 0xffdf24) throw Error("Missing label/indicator " + terminal.id);
  }

  function follow(indices, start) {
    camera.position.fromArray(start);
    walk.clearInput();
    let length = 0;
    for (const index of indices) {
      const [x, , z] = survey.nodes[index].position;
      let frame = 0;
      while (Math.hypot(camera.position.x - x, camera.position.z - z) > 0.13 && frame++ < 600) {
        const before = camera.position.clone();
        camera.lookAt(x, camera.position.y, z);
        walk.syncEulerFromCamera();
        walk.setMoveAxes(0, -1);
        director.update(1 / 60);
        length += camera.position.distanceTo(before);
      }
      if (frame >= 600) throw Error("Walking route blocked at " + [x, z] + " from " + camera.position.toArray());
      walk.clearInput();
    }
    education.update();
    return Number(length.toFixed(2));
  }
  for (const terminal of layout) {
    readings[`spawn-${terminal.id}`] = follow(survey.routes[terminal.id], survey.start);
    const distance = camera.position.distanceTo(new Vector3(...terminal.position).add(new Vector3(0, 1.2, 0)));
    if (distance > 2.6) throw Error("Cannot interact on foot " + terminal.id);
    if (!education.modal.open(terminal.id)) throw Error("Cannot open terminal " + terminal.id);
    education.modal.close();
  }
  for (const [pair, route] of Object.entries(survey.pairRoutes)) {
    const source = pair.split("-")[0];
    readings[pair] = follow(route, survey.nodes[survey.approachNodes[source]].position);
  }

  // Test actual X/proximity/line-of-sight gates, including an intervening wall
  // placed only in the harness. Invisible original bounds remain raycastable.
  const first = layout[0];
  camera.position.fromArray(survey.nodes[survey.approachNodes[first.id]].position);
  education.update();
  const prompt = document.querySelector(".education-prompt");
  if (prompt.hidden || !prompt.textContent.includes(first.id)) throw Error("No nearby X prompt");
  const wall = new Mesh(new BoxGeometry(2, 3, 0.15), new MeshBasicMaterial({ side: DoubleSide }));
  const target = new Vector3(...first.position).add(new Vector3(0, 1.2, 0));
  wall.position.copy(camera.position).lerp(target, 0.5);
  wall.lookAt(target.x, wall.position.y, target.z);
  wall.updateMatrixWorld(true);
  // sceneColliders is a snapshot of the original world roots, so attach this
  // temporary obstacle to an original root without changing city geometry.
  // Add to the city root in world coordinates, accounting for its Y transform.
  world.city.add(wall);
  wall.position.y -= world.city.position.y;
  wall.updateMatrixWorld(true);
  education.update();
  if (!prompt.hidden) throw Error("Interaction through a wall");
  window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyX", key: "x", bubbles: true }));
  if (education.modal.isOpen()) throw Error("X opened through a wall");
  wall.removeFromParent(); wall.geometry.dispose(); wall.material.dispose();
  camera.position.y += 10;
  education.update();
  if (!prompt.hidden) throw Error("Interaction from inaccessible height");
  window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyX", key: "x", bubbles: true }));
  if (education.modal.isOpen()) throw Error("X opened from inaccessible height");
  return readings;
}
