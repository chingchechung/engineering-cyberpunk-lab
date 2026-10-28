import * as THREE from "three/webgpu";
import { TERMINAL_LAYOUT } from "./terminalLayout.js";

function createLabel(id) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 112;
  const context = canvas.getContext("2d");
  context.fillStyle = "#111b23";
  context.fillRect(0, 0, 256, 112);
  context.strokeStyle = "#ffdf49";
  context.lineWidth = 6;
  context.strokeRect(3, 3, 250, 106);
  context.fillStyle = "#ffdf49";
  context.font = "bold 64px monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(id, 128, 60);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, toneMapped: false });
  const label = new THREE.Sprite(material);
  label.name = `${id}-label`;
  label.scale.set(1.25, 0.55, 1);
  label.position.y = 2.12;
  return label;
}

export function createTerminals({ scene }) {
  const root = new THREE.Group();
  root.name = "education-terminals";
  const casingGeometry = new THREE.BoxGeometry(0.5, 1.35, 0.45);
  const casingMaterial = new THREE.MeshStandardNodeMaterial({ color: 0x172831, metalness: 0.45, roughness: 0.55 });
  const screenGeometry = new THREE.BoxGeometry(0.54, 0.36, 0.49);
  const screenMaterial = new THREE.MeshBasicMaterial({ color: 0x67d5d0, toneMapped: false });
  const indicatorGeometry = new THREE.SphereGeometry(0.12, 12, 8);
  const indicatorMaterial = new THREE.MeshBasicMaterial({ color: 0xffdf24, toneMapped: false });
  const colliders = [];
  const entries = TERMINAL_LAYOUT.map((terminal) => {
    const group = new THREE.Group();
    group.name = terminal.id;
    group.position.set(...terminal.position);
    const casing = new THREE.Mesh(casingGeometry, casingMaterial);
    casing.position.y = 0.675;
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.y = 1.1;
    const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
    indicator.name = `${terminal.id}-yellow-indicator`;
    indicator.position.y = 1.62;
    const label = createLabel(terminal.id);
    group.add(casing, screen, indicator, label);
    colliders.push(casing);
    root.add(group);
    return { ...terminal, group, label, indicator, collider: casing };
  });
  scene.add(root);
  root.updateMatrixWorld(true);
  return {
    entries,
    colliders,
    destroy() {
      root.removeFromParent();
      for (const entry of entries) {
        entry.label.material.map.dispose();
        entry.label.material.dispose();
      }
      for (const resource of [casingGeometry, casingMaterial, screenGeometry, screenMaterial, indicatorGeometry, indicatorMaterial]) resource.dispose();
    },
  };
}
