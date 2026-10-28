// Curated Unicode text, independent of Canvas, fonts and browser APIs.
export const GLYPH_GROUPS = Object.freeze([
  { id: 'english', characters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', slots: 5 },
  { id: 'numbers', characters: '0123456789+-=<>*', slots: 4 },
  { id: 'japanese', characters: 'アイウエオカキクケコサシスセソタチツテトナニヌネノあいうえおかきくけこさしすせそ', slots: 6 },
  { id: 'korean', characters: '가나다라마바사아자차카타파하', slots: 5 },
].map(group => Object.freeze(group)));
export const GLYPHS = Object.freeze(GLYPH_GROUPS.flatMap(group =>
  Array.from(group.characters, character => Object.freeze({ character, category: group.id }))));
export const GLYPH_COUNT = GLYPHS.length;
export const GLYPH_ATLAS = Object.freeze({ columns: 12, rows: Math.ceil(GLYPH_COUNT / 12), cellWidth: 64, cellHeight: 96, padding: 6, fontSize: 56 });

export function glyphCell(index) {
  if (!Number.isInteger(index) || index < 0 || index >= GLYPH_COUNT) throw new RangeError('Invalid glyph index');
  return { x: index % GLYPH_ATLAS.columns * GLYPH_ATLAS.cellWidth,
    y: Math.floor(index / GLYPH_ATLAS.columns) * GLYPH_ATLAS.cellHeight,
    width: GLYPH_ATLAS.cellWidth, height: GLYPH_ATLAS.cellHeight };
}

// Canvas top row is texture v=0 (flipY=false); plane v=1 is its top edge.
export function glyphUv(index, u, v) {
  const cell = glyphCell(index);
  return [(cell.x + u * cell.width) / (GLYPH_ATLAS.columns * cell.width),
    (cell.y + (1 - v) * cell.height) / (GLYPH_ATLAS.rows * cell.height)];
}

export function selectColumnGlyphs(seed, column) {
  let state = (seed ^ Math.imul(column + 1, 0x9e3779b9)) >>> 0;
  function random() { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; }
  function shuffle(values) {
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1)); [values[i], values[j]] = [values[j], values[i]];
    }
    return values;
  }
  // First four include every category, even in the shortest eight-slot trail.
  // Full columns contain exactly 25/20/30/25%; no geographic partitioning.
  const first = shuffle(GLYPH_GROUPS.map((_, i) => i));
  const rest = shuffle(GLYPH_GROUPS.flatMap((group, i) => Array(group.slots - 1).fill(i)));
  let offset = 0;
  const pools = GLYPH_GROUPS.map(group => {
    const indices = Array.from(group.characters, (_, i) => offset + i);
    offset += indices.length; return shuffle(indices);
  });
  return [...first, ...rest].map(category => pools[category].pop());
}
