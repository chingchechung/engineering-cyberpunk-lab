// Positions use the original city's -20 Y transform and wet ground at -5.4.
// Phase 3 sites selected from the actual GLB/controller connected-region survey.
// See tests/fixtures/terminal-survey.json and docs/phase-3-results.md.
export const TERMINAL_LAYOUT = Object.freeze([
  { id: "Q01", position: [-166.564, -5.4, 36.181] },
  { id: "Q02", position: [-94.564, -5.4, 14.181] },
  { id: "Q03", position: [-34.564, -5.4, 48.181] },
  { id: "Q04", position: [87.436, -5.4, 20.181] },
  { id: "Q05", position: [17.436, -5.4, -1.819] },
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
