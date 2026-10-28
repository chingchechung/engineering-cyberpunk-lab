// World metres. Surveyed gaps bend NW/SE at the ends of the X-longitudinal street.
// Causeways pass between existing buildings; plazas sit beyond the city AABB.
export const MATRIX_GROUND_Y = -5.398; // 2 mm above wet ground, avoiding coplanar fighting.
export const MATRIX_ZONES = [
  {
    id: 'west', entrance: [-168.2, 36.8], outward: [-Math.SQRT1_2, Math.SQRT1_2],
    plaza: [-288, 50], size: 44,
    route: [[-169, 37], [-184, 50], [-269, 50], [-288, 50]],
    // Clockwise outline; the closing edge is the only entrance (no added wall).
    outline: [[-169.4, 35.6], [-185.2, 47.2], [-266, 47.2], [-266, 28],
      [-310, 28], [-310, 72], [-266, 72], [-266, 52.8], [-183, 52.8], [-167, 38]],
    opening: { min: [-171, -6, 34.8], max: [-165.8, -1.6, 40] },
  },
  {
    id: 'east', entrance: [88.9, 18], outward: [Math.SQRT1_2, -Math.SQRT1_2],
    plaza: [171, 3], size: 44,
    route: [[89, 18], [104, 3], [152, 3], [171, 3]],
    outline: [[87.7, 16.8], [102.8, 0.2], [149, 0.2], [149, -19],
      [193, -19], [193, 25], [149, 25], [149, 5.8], [105.2, 5.8], [90.1, 19.2]],
    opening: { min: [86.8, -6, 14.6], max: [91, -1.6, 21] },
  },
];

export const MATRIX_BUDGET = Object.freeze({ columnsPerZone: 256, glyphsPerColumn: 20, atlasCells: 64, fadeFar: 64 });

export function distanceToZone(x, z, zone) {
  let distance = Infinity;
  const [cx, cz] = zone.plaza;
  distance = Math.hypot(Math.max(0, Math.abs(x - cx) - zone.size / 2), Math.max(0, Math.abs(z - cz) - zone.size / 2));
  let [ax, az] = zone.entrance;
  for (const [bx, bz] of zone.route) {
    const dx = bx - ax, dz = bz - az, lengthSq = dx * dx + dz * dz;
    const t = lengthSq ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSq)) : 0;
    distance = Math.min(distance, Math.hypot(x - ax - dx * t, z - az - dz * t));
    ax = bx; az = bz;
  }
  return distance;
}
