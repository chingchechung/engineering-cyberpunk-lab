import { MeshBasicMaterial, Box3, BoxGeometry, Mesh, Vector3, DoubleSide, FrontSide } from "three/webgpu";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { buildModelBvh } from "../../src/world/bvh.js";
import { CITY_OFFSET_Y } from "../../src/world/city/loadCity.js";
import { QUADRA_START } from "../../src/world/car/loadCar.js";

// Geometry-only test fixture. Decode the actual bundled GLBs, preserving node
// transforms. Skip textures/materials without changing the production loader.
export async function loadGeometry() {
  const draco = new DRACOLoader().setDecoderPath("/libs/draco/");
  const loader = new GLTFLoader().setDRACOLoader(draco);
  loader.register((parser) => {
    // Raycast sidedness affects collision even without rendering. Preserve the
    // GLB material flag while omitting only textures/shader work in this fixture.
    parser.loadMaterial = async (index) => new MeshBasicMaterial({
      side: parser.json.materials?.[index]?.doubleSided ? DoubleSide : FrontSide,
    });
    return { name: "test-geometry-only" };
  });
  const [city, bounds, car] = await Promise.all([
    "cyberpunk_compressed", "colider", "quadra",
  ].map(async (name) => (await loader.loadAsync(`/models/${name}.glb`)).scene));
  city.position.y = bounds.position.y = CITY_OFFSET_Y;
  car.position.set(...QUADRA_START.position);
  car.rotation.y = QUADRA_START.rotationY;
  car.scale.setScalar(QUADRA_START.scale);
  for (const root of [city, bounds, car]) {
    root.updateMatrixWorld(true);
    buildModelBvh(root);
  }
  // Conservative world AABB contains the production oriented car collider.
  const carBox = new Box3().setFromObject(car);
  const carBlocker = new Mesh(new BoxGeometry(...carBox.getSize(new Vector3()).toArray()), new MeshBasicMaterial());
  carBlocker.position.copy(carBox.getCenter(new Vector3()));
  carBlocker.updateMatrixWorld(true);
  buildModelBvh(carBlocker);
  draco.dispose();
  return { city, bounds, car, carBox, colliders: [city, bounds, carBlocker] };
}
