import { CanvasTexture, LinearFilter } from 'three/webgpu';
import { GLYPHS, GLYPH_ATLAS, glyphCell } from './glyphInventory.js';

export const MATRIX_FONT_FAMILY = 'Lab Matrix Text';
const fontUrl = new URL('./fonts/lab-matrix-text.woff2', import.meta.url);
let fontReady;

export function loadMatrixFont() {
  // One local, known-coverage face; never rasterize with an incidental fallback.
  fontReady ??= (async () => {
    const face = new FontFace(MATRIX_FONT_FAMILY, `url("${fontUrl.href}") format("woff2")`, { weight: '400', style: 'normal' });
    await face.load();
    document.fonts.add(face);
    return face;
  })();
  return fontReady;
}

export async function createGlyphAtlas() {
  await loadMatrixFont();
  const canvas = document.createElement('canvas');
  canvas.width = GLYPH_ATLAS.columns * GLYPH_ATLAS.cellWidth;
  canvas.height = GLYPH_ATLAS.rows * GLYPH_ATLAS.cellHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#ffffff';
  context.textBaseline = 'alphabetic';
  const entries = GLYPHS.map((glyph, index) => {
    const cell = glyphCell(index);
    let size = GLYPH_ATLAS.fontSize;
    context.font = `${size}px "${MATRIX_FONT_FAMILY}"`;
    let metrics = context.measureText(glyph.character);
    const fit = Math.min(1, (cell.width - GLYPH_ATLAS.padding * 2) /
      (metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight),
    (cell.height - GLYPH_ATLAS.padding * 2) /
      (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent));
    size *= fit;
    context.font = `${size}px "${MATRIX_FONT_FAMILY}"`;
    metrics = context.measureText(glyph.character);
    const x = cell.x + cell.width / 2 + (metrics.actualBoundingBoxLeft - metrics.actualBoundingBoxRight) / 2;
    const y = cell.y + cell.height / 2 + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
    context.fillText(glyph.character, x, y);
    return { ...glyph, index, ...cell, baselineX: x, baselineY: y, fontSize: size };
  });
  const atlas = new CanvasTexture(canvas);
  atlas.name = 'Curated multilingual Unicode text';
  atlas.flipY = false; // UV y is flipped within each cell in createDigitalRain.
  atlas.magFilter = atlas.minFilter = LinearFilter;
  atlas.generateMipmaps = false;
  atlas.userData.glyphs = entries;
  atlas.needsUpdate = true;
  return atlas;
}
