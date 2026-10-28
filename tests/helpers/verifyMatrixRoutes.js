import * as T from 'three/webgpu';
import { MATRIX_ZONES, MATRIX_GROUND_Y } from '../../src/world/matrix/matrixLayout.js';
import { collectCollisionHideObjects } from '../../src/world/weather/collisionHideObjects.js';

export async function verifyMatrixRoutes(app, survey) {
  const {camera,director,world,education}=app, walk=director.walkControls, matrix=world.matrix;
  const ray=new T.Raycaster(), down=new T.Vector3(0,-1,0), direction=new T.Vector3(), origin=new T.Vector3();
  const readings={routes:{},wallSamples:0,boundaryEdges:0,supportSamples:0,lookBackRays:{}};
  readings.originalBoundsTriangles=matrix.openings.replacements.reduce((n,r)=>n+(r.original.index?.count??r.original.attributes.position.count)/3,0);
  readings.openedBoundsTriangles=matrix.openings.replacements.reduce((n,r)=>n+r.geometry.attributes.position.count/3,0);
  const near = value=>Math.abs(value+3.85)<.02;
  function support() {
    if(!near(camera.position.y))throw Error('Unexpected eye height '+camera.position.toArray());
    ray.set(origin.copy(camera.position),down);ray.far=1.7;
    const hit=ray.intersectObjects([world.city,world.walkGround],true).find(h=>Math.abs(h.point.y+5.4)<.02);
    if(!hit)throw Error('Unsupported movement '+camera.position.toArray());
    readings.supportSamples++;
  }
  function follow(points) {
    let length=0;
    for(const [x,z] of points){let frame=0;
      while(Math.hypot(camera.position.x-x,camera.position.z-z)>.13 && frame++<4000) {
        const before=camera.position.clone();camera.lookAt(x,camera.position.y,z);walk.syncEulerFromCamera();
        walk.setMoveAxes(0,-1);director.update(1/60);matrix.update(1/60,camera);
        const step=camera.position.distanceTo(before);
        if(step>4.5/60+.001)throw Error('Position jump or walking speed change');
        length+=step;support();
      }
      walk.clearInput();
      if(frame>=4000)throw Error('Blocked route '+[x,z]+' at '+camera.position.toArray());
    }
    return +length.toFixed(2);
  }
  const paths={
    west:[[-164,34],[-167.4,35],[-169,37],[-184,50],[-269,50],[-288,50]],
    east:[[84,20],[85.7,20.7],[86.2,19.3],[88.4,17.6],[104,3],[152,3],[171,3]],
  };
  for(const zone of MATRIX_ZONES) {
    const tid=zone.id==='west'?'Q01':'Q04';
    camera.position.fromArray(survey.start);walk.clearInput();
    const cityRoute=survey.routes[tid].map(i=>{const p=survey.nodes[i].position;return [p[0],p[2]]});
    readings.routes[zone.id+'Out']=follow([...cityRoute,...paths[zone.id]]);
    // Cross the plaza and return through every seam by continuous input only.
    const [cx,cz]=zone.plaza;
    readings.routes[zone.id+'Explore']=follow([[cx,cz+17],[cx+17,cz+17],[cx+17,cz-17],[cx-17,cz-17],[cx-17,cz+17],[cx,cz]]);
    readings.routes[zone.id+'Return']=follow([...paths[zone.id]].reverse().concat([...cityRoute].reverse()));
    if(camera.position.distanceTo(new T.Vector3(...survey.start))>.2)throw Error('Did not return to original spawn');
    // Actual original city rays looking back from the transition, not a visual claim.
    const p=zone.id==='west'?[-177,-3.85,44]:[99,-3.85,8];
    ray.set(new T.Vector3(...p),new T.Vector3(zone.id==='west'?1:-1,0,0));ray.far=120;
    const hits=ray.intersectObject(world.city,true);
    if(!hits.length || !world.city.visible)throw Error('Original city missing looking back');
    const covers=ray.intersectObject(matrix.effectsGroup,true).filter(h=>h.object.name.indexOf('digital-rain')<0);
    if(covers.some(h=>h.distance<hits[0].distance))throw Error('Matrix backdrop obscures the city at transition');
    readings.lookBackRays[zone.id]=hits[0].distance;
    // Every new perimeter segment: try crossing at normal and sprint speed.
    const poly=zone.outline;
    const signedArea=poly.reduce((sum,a,i)=>{const b=poly[(i+1)%poly.length];return sum+a[0]*b[1]-b[0]*a[1];},0);
    for(let i=0;i<poly.length-1;i++) {
      const a=poly[i],b=poly[i+1],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
      // Interior is left for positive area, right for negative area.
      const nx=-dz/len*Math.sign(signedArea),nz=dx/len*Math.sign(signedArea);
      const x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;
      for(const sprint of [false,true]) {
        camera.position.set(x+nx*1.4,-3.85,z+nz*1.4);walk.clearInput();
        camera.lookAt(x-nx*4,camera.position.y,z-nz*4);walk.syncEulerFromCamera();
        if(sprint)window.dispatchEvent(new KeyboardEvent('keydown',{code:'ShiftLeft',key:'Shift',bubbles:true}));
        for(let frame=0;frame<180;frame++){walk.setMoveAxes(0,-1);director.update(1/60);}
        window.dispatchEvent(new KeyboardEvent('keyup',{code:'ShiftLeft',key:'Shift',bubbles:true}));
        const remaining=(camera.position.x-x)*nx+(camera.position.z-z)*nz;
        if(remaining<.5)throw Error('Unsafe boundary '+zone.id+' '+i+' '+remaining);
        walk.clearInput();
      }
      readings.boundaryEdges++;
    }
    for (const dx of [-1,1]) for (const dz of [-1,1]) {
      camera.position.set(cx+dx*19,-3.85,cz+dz*19);walk.clearInput();
      camera.lookAt(cx+dx*27,camera.position.y,cz+dz*27);walk.syncEulerFromCamera();
      for(let i=0;i<240;i++){walk.setMoveAxes(0,-1);director.update(1/60);}
      if(Math.abs(camera.position.x-cx)>21.5||Math.abs(camera.position.z-cz)>21.5)throw Error('Unsafe exterior corner');
      walk.clearInput();
    }
  }
  // Compare all original boundary surfaces on a barycentric grid. Exclude only
  // samples inside the explicit opening boxes; every other sampled wall remains.
  const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),normal=new T.Vector3(),sample=new T.Vector3();
  for(const replacement of matrix.openings.replacements) {
    const {mesh,original}=replacement,p=original.attributes.position,index=original.index;
    for(let i=0;i<(index?.count??p.count);i+=3) {
      [a,b,c].forEach((v,j)=>v.fromBufferAttribute(p,index?index.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld));
      new T.Triangle(a,b,c).getNormal(normal);if(normal.lengthSq()<.9)continue;
      for(let u=1;u<12;u++)for(let v=1;v<12-u;v++) {
        sample.copy(a).multiplyScalar(1-(u+v)/12).addScaledVector(b,u/12).addScaledVector(c,v/12);
        if(MATRIX_ZONES.some(z=>sample.x>z.opening.min[0]-.02&&sample.x<z.opening.max[0]+.02&&sample.y>z.opening.min[1]-.02&&sample.y<z.opening.max[1]+.02&&sample.z>z.opening.min[2]-.02&&sample.z<z.opening.max[2]+.02))continue;
        ray.set(origin.copy(sample).addScaledVector(normal,.15),direction.copy(normal).negate());ray.far=.3;
        if(!ray.intersectObject(mesh,true).some(h=>Math.abs(h.distance-.15)<.002))throw Error('Original wall lost outside opening '+sample.toArray());
        readings.wallSamples++;
      }
    }
  }
  // City buildings alongside each opening must still block actual movement.
  for(const [from,to] of [[[-164,34],[-177,34]],[[84,24],[99,24]]]) {
    camera.position.set(from[0],-3.85,from[1]);walk.clearInput();
    camera.lookAt(to[0],camera.position.y,to[1]);walk.syncEulerFromCamera();
    for(let i=0;i<300;i++){walk.setMoveAxes(0,-1);director.update(1/60);}
    if(Math.hypot(camera.position.x-to[0],camera.position.z-to[1])<2)throw Error('Nearby building collision lost');
    walk.clearInput();
  }
  // Bounded effects, unchanged globals/camera pose, height-pass isolation, cleanup.
  const beforePosition=camera.position.clone(),beforeQuaternion=camera.quaternion.clone();
  camera.position.set(1000,-3.85,1000);matrix.update(1/60,camera);
  if(matrix.entries.some(e=>e.effect.visible))throw Error('Distant effects not culled');
  camera.position.copy(beforePosition);matrix.update(1/60,camera);
  if(camera.position.distanceTo(beforePosition)>0||camera.quaternion.angleTo(beforeQuaternion)>1e-7)throw Error('Matrix changed camera pose');
  if(!collectCollisionHideObjects(world).includes(matrix.effectsGroup))throw Error('Glyphs pollute rain height pass');
  const disposed=new Set(),items=[matrix.atlas,...matrix.openings.replacements.map(r=>r.geometry)];
  matrix.group.traverse(o=>{if(o.geometry)items.push(o.geometry);if(o.material)items.push(o.material);});
  matrix.ground.traverse(o=>{if(o.geometry)items.push(o.geometry);if(o.material)items.push(o.material);});
  for(const r of new Set(items))r.addEventListener('dispose',()=>disposed.add(r));
  matrix.dispose();matrix.dispose();
  if(matrix.group.parent||matrix.ground.parent)throw Error('Matrix objects retained after disposal');
  if(world.colliders.includes(matrix.collider))throw Error('Disposed Matrix collider still registered');
  if(new Set(items).size!==disposed.size)throw Error('Matrix resource leak '+disposed.size+'/'+new Set(items).size);
  if(matrix.openings.replacements.some(r=>r.mesh.geometry!==r.original))throw Error('Original collider not restored');
  readings.disposedResources=disposed.size;
  readings.glyphInstances=matrix.entries.reduce((n,e)=>n+e.rain.mesh.geometry.instanceCount,0);
  readings.groundY=MATRIX_GROUND_Y;
  return readings;
}
