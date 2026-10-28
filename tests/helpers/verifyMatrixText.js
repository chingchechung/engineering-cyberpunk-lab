import { GLYPHS, GLYPH_ATLAS, selectColumnGlyphs, glyphUv } from '../../src/world/matrix/glyphInventory.js';
import { MATRIX_FONT_FAMILY, loadMatrixFont } from '../../src/world/matrix/glyphAtlas.js';

export async function verifyMatrixText(app) {
  const matrix=app.world.matrix,atlas=matrix.atlas,canvas=atlas.image;
  const font=await loadMatrixFont();
  if(font!==await loadMatrixFont()||font.status!=='loaded')throw Error('Font loading is not shared/ready');
  if(!document.fonts.check(`56px "${MATRIX_FONT_FAMILY}"`,GLYPHS.map(g=>g.character).join('')))throw Error('Font not usable');
  if(canvas.width!==768||canvas.height!==768||atlas.flipY!==false)throw Error('Unexpected atlas layout/orientation');
  const context=canvas.getContext('2d'),hashes=new Set();
  const reference=document.createElement('canvas');reference.width=64;reference.height=96;
  const ref=reference.getContext('2d');ref.fillStyle='#fff';ref.textBaseline='alphabetic';
  function hash(data){let value=2166136261;for(const byte of data)value=Math.imul(value^byte,16777619);return value>>>0;}
  function referencePixels(character,entry) {
    ref.clearRect(0,0,64,96);ref.font=`${entry.fontSize}px "${MATRIX_FONT_FAMILY}"`;
    // Independently position the expected Unicode character using its ink box.
    const m=ref.measureText(character);
    ref.fillText(character,32+(m.actualBoundingBoxLeft-m.actualBoundingBoxRight)/2,48+(m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)/2);
    return ref.getImageData(0,0,64,96).data;
  }
  const cells=[];
  for(let i=0;i<GLYPHS.length;i++) {
    const entry=atlas.userData.glyphs[i],expected=GLYPHS[i];
    if(entry.character!==expected.character||entry.category!==expected.category)throw Error('Incorrect atlas metadata '+i);
    const pixels=context.getImageData(entry.x,entry.y,64,96).data;
    const referenceData=referencePixels(expected.character,entry);
    if(pixels.some((value,index)=>value!==referenceData[index]))throw Error('Character mapped to incorrect cell '+i);
    let minX=64,maxX=-1,minY=96,maxY=-1,ink=0;
    for(let y=0;y<96;y++)for(let x=0;x<64;x++)if(pixels[(y*64+x)*4+3]){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);ink++;}
    if(ink<20||minX<5||maxX>58||minY<5||maxY>90)throw Error('Empty/clipped glyph or unsafe padding '+expected.character);
    if(Math.abs((minX+maxX+1)/2-32)>1||Math.abs((minY+maxY+1)/2-48)>1)throw Error('Uncentered character '+expected.character);
    const fingerprint=hash(pixels);hashes.add(fingerprint);
    for(const replacement of ['\uffff','\ufffd','?'])if(fingerprint===hash(referencePixels(replacement,entry)))throw Error('Missing glyph/substitution '+expected.character);
    const [u,v]=glyphUv(i,.5,.5);
    if(Math.abs(u*768-(entry.x+32))>1e-6||Math.abs(v*768-(entry.y+48))>1e-6)throw Error('UV-to-cell mismatch');
    cells.push({character:entry.character,category:entry.category,ink,bounds:[minX,minY,maxX,maxY]});
  }
  if(hashes.size!==96)throw Error('Duplicate or replacement character raster');
  const visibleTotals={english:0,numbers:0,japanese:0,korean:0};let visibleCount=0;
  if(matrix.entries.length!==2)throw Error('Rain draw architecture changed');
  const saved=matrix.entries.map(({rain},zone)=>{
    const a=rain.mesh.geometry.attributes.matrixGlyph.array;
    if(rain.mesh.geometry.instanceCount!==5120||rain.mesh.children.length)throw Error('Instance cap/draw architecture changed');
    for(let column=0;column<256;column++) {
      const expected=selectColumnGlyphs(zone+41,column),length=rain.columns[column][4];
      for(let g=0;g<20;g++) {
        const index=a[(column*20+g)*3+2];if(index!==expected[g])throw Error('GPU character index differs from Unicode inventory');
        if(g<length){visibleTotals[GLYPHS[index].category]++;visibleCount++;}
      }
    }
    return {indices:a.slice(),columns:rain.mesh.geometry.attributes.matrixColumn.array.slice()};
  });
  const version=atlas.version,pixelsBefore=hash(context.getImageData(0,0,768,768).data);
  for(let i=0;i<600;i++)matrix.update(1/60,app.camera);
  for(const [i,{rain}] of matrix.entries.entries()) {
    if(rain.mesh.geometry.attributes.matrixGlyph.array.some((v,j)=>v!==saved[i].indices[j])||rain.mesh.geometry.attributes.matrixColumn.array.some((v,j)=>v!==saved[i].columns[j]))throw Error('Animation rerandomized characters or column motion data');
  }
  if(atlas.version!==version||pixelsBefore!==hash(context.getImageData(0,0,768,768).data))throw Error('Atlas rerasterized during animation');
  return {characters:96,uniqueRasters:hashes.size,fontStatus:font.status,atlas:[canvas.width,canvas.height],
    visibleDistribution:Object.fromEntries(Object.entries(visibleTotals).map(([key,n])=>[key,+(n/visibleCount*100).toFixed(2)])),
    glyphInstances:10240,stableFrames:600,cells};
}
