// Positions use the original city's -20 Y transform and wet ground at -5.4.
// Actual GLB clearance and a control-driven walking route are checked in tests.
export const TERMINAL_LAYOUT = Object.freeze([
  { id: "Q01", position: [-136, -5.4, 29] },
  { id: "Q02", position: [-130, -5.4, 27] },
  { id: "Q03", position: [-123, -5.4, 27] },
  { id: "Q04", position: [-116, -5.4, 30] },
  { id: "Q05", position: [-111, -5.4, 34] },
].map((entry) => Object.freeze({ ...entry, position: Object.freeze(entry.position) })));

export const INTERACTION_RADIUS = 2.6;

export function findNearbyTerminal(position, terminals = TERMINAL_LAYOUT) {
  let nearest = null;
  let nearestDistance = INTERACTION_RADIUS ** 2;
  for (const terminal of terminals) {
    const [x, y, z] = terminal.position;
    // Distance to the terminal's display, including height: no access from roofs.
    const distance = (position.x - x) ** 2 + (position.y - y - 1.2) ** 2 + (position.z - z) ** 2;
    if (distance <= nearestDistance) {
      nearest = terminal;
      nearestDistance = distance;
    }
  }
  return nearest;
}
