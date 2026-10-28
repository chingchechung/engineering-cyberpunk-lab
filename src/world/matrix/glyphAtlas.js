import { DataTexture, RGBAFormat, UnsignedByteType, NearestFilter } from 'three/webgpu';

// Original 5x7 bit symbols, generated from simple strokes and deterministic bits.
// No font, photograph, film texture or external resource is used.
export function glyphPixels() {
  const width = 64, height = 96, data = new Uint8Array(width * height * 4);
  for (let glyph = 0; glyph < 64; glyph++) {
    let bits = (glyph + 1) * 2654435761 >>> 0;
    for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) {
      bits ^= bits << 13; bits ^= bits >>> 17; bits ^= bits << 5;
      const stroke = (x === 2 && (glyph & 1)) || (y === 3 && (glyph & 2)) ||
        ((x === 0 || x === 4) && y > 0 && y < 6 && (glyph & 4));
      if (!stroke && (bits >>> 0) % 5 > 1) continue;
      const offset = (((glyph >> 3) * 12 + y + 2) * width + (glyph % 8) * 8 + x + 1) * 4;
      data.set([255, 255, 255, 255], offset);
    }
  }
  return { data, width, height };
}

export function createGlyphAtlas() {
  const { data, width, height } = glyphPixels();
  const atlas = new DataTexture(data, width, height, RGBAFormat, UnsignedByteType);
  atlas.name = 'Original procedural digital glyphs';
  atlas.magFilter = atlas.minFilter = NearestFilter;
  atlas.generateMipmaps = false;
  atlas.needsUpdate = true;
  return atlas;
}
