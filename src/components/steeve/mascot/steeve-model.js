import * as THREE from 'three';

// Modèle du pack « steeve-3d-logisorama-v1 » (Three.js 0.186), adapté à la version de Three.js du projet
// (0.133) : couleurs données en sRGB puis converties en linéaire, noms de propriétés de l'API 0.133
// (sheenTint, specularTint, attenuationTint). Ajouts Logisorama : expressions supplémentaires (rire, clin d'œil,
// surprise, tristesse, réflexion, sommeil, sourcils), en volumes noirs comme les yeux et la bouche.
const COLOR_KEYS = { color: 'color', sheenColor: 'sheenTint', specularColor: 'specularTint', attenuationColor: 'attenuationTint' };

export function srgb(value) {
  return (value instanceof THREE.Color ? value.clone() : new THREE.Color(value)).convertSRGBToLinear();
}

/**
 * STEEVE · single master, reconstructed from the approved reference sheets.
 * Y-up, front +Z, feet at 0, height 3.8 arbitrary model units (not metres).
 * Left/right are screen-left/screen-right in the front view.
 * Real closed meshes. Hierarchical transform rig; no skin/armature dependency.
 */
export function createSteeveModel() {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  const geo = g => (geometries.add(g), g);
  const mat = (name, p) => {
    const adapted = {};
    for (const [key, value] of Object.entries(p)) {
      if (key in COLOR_KEYS) adapted[COLOR_KEYS[key]] = srgb(value);
      else adapted[key] = value;
    }
    const m = new THREE.MeshPhysicalMaterial(adapted); m.name = name; materials.add(m); return m;
  };
  // Periodic micro-weave normal texture: original, deterministic, no remote asset.
  const n = 128, data = new Uint8Array(n * n * 4);
  const height = (x, y) => {
    const u = x * Math.PI / 4, v = y * Math.PI / 4;
    return .5 * Math.sin(u) * Math.cos(v) + .2 * Math.sin(u * 2 + v);
  };
  for (let y=0; y<n; y++) for (let x=0; x<n; x++) {
    const dx = (height(x+1,y)-height(x-1,y))*.5, dy=(height(x,y+1)-height(x,y-1))*.5;
    const normal = new THREE.Vector3(-dx,-dy,1).normalize(), k=(y*n+x)*4;
    data[k]=Math.round((normal.x*.5+.5)*255); data[k+1]=Math.round((normal.y*.5+.5)*255);
    data[k+2]=Math.round((normal.z*.5+.5)*255); data[k+3]=255;
  }
  const weave = new THREE.DataTexture(data,n,n,THREE.RGBAFormat,THREE.UnsignedByteType);
  weave.name='Steeve ivory micro-weave normal'; weave.wrapS=weave.wrapT=THREE.RepeatWrapping;
  weave.repeat.set(14,14); weave.generateMipmaps=true; weave.minFilter=THREE.LinearMipmapLinearFilter;
  weave.magFilter=THREE.LinearFilter; weave.needsUpdate=true; textures.add(weave);
  const shell=mat('Pearl white ceramic shell',{color:'#f4f4f2',roughness:.18,metalness:0,clearcoat:1,clearcoatRoughness:.1,ior:1.46});
  const lens=mat('Milky white face lens',{color:'#fafafa',roughness:.16,metalness:0,clearcoat:1,clearcoatRoughness:.065});
  const rim=mat('Polished white rim',{color:'#fafafa',roughness:.2,metalness:.02,clearcoat:.8,clearcoatRoughness:.12,envMapIntensity:.6});
  const eye=mat('Black raised eyes and mouth',{color:'#070909',roughness:.19,metalness:.06,clearcoat:1,clearcoatRoughness:.08});
  const marks=mat('Black forehead symbols',{color:'#181a19',roughness:.28,metalness:.10,clearcoat:.4});
  const seam=mat('Subtle ivory seams',{color:'#cac7bc',roughness:.92});
  const cloth=mat('Ivory woven wool suit',{color:'#e9e5da',roughness:.88,metalness:0,sheen:.5,sheenColor:new THREE.Color('#fffaf0'),sheenRoughness:.8,normalMap:weave,normalScale:new THREE.Vector2(.13,.13)});
  const lapelMat=mat('Ivory woven lapels',{color:'#eeeadf',roughness:.82,sheen:.4,sheenColor:new THREE.Color('#fffaf0'),sheenRoughness:.8,normalMap:weave,normalScale:new THREE.Vector2(.13,.13)});
  const shirt=mat('White cotton shirt',{color:'#ffffff',roughness:.83});
  const tieMat=mat('Charcoal silk tie',{color:'#151718',roughness:.52,sheen:.3,sheenColor:new THREE.Color('#7e8282'),sheenRoughness:.6});
  const glove=mat('Soft white hands',{color:'#f6f6f4',roughness:.43,clearcoat:.12});
  const leather=mat('Polished black leather',{color:'#101212',roughness:.3,clearcoat:.7,clearcoatRoughness:.2});
  const soleMat=mat('Black rubber soles',{color:'#101110',roughness:.82});

  const group=(name,parent,pos=[0,0,0])=>{const g=new THREE.Group();g.name=name;g.position.set(...pos);parent?.add(g);return g;};
  const mesh=(name,g,m,parent,pos=[0,0,0])=>{const o=new THREE.Mesh(g,m);o.name=name;o.position.set(...pos);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
  const poly=points=>{const s=new THREE.Shape();s.moveTo(...points[0]);points.slice(1).forEach(p=>s.lineTo(...p));s.closePath();return s;};
  function roundPath(w,h,r) {
    const s=new THREE.Shape(), x=-w/2,y=-h/2;
    s.moveTo(x+r,y); s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
    s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);
    s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);s.closePath();return s;
  }
  function smoothNormals(g) {
    g.computeVertexNormals();
    const p=g.attributes.position,normals=g.attributes.normal,sums=new Map(),keys=[];
    for(let i=0;i<p.count;i++){
      const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e5)).join(',');keys.push(key);
      if(!sums.has(key))sums.set(key,new THREE.Vector3());
      sums.get(key).add(new THREE.Vector3(normals.getX(i),normals.getY(i),normals.getZ(i)));
    }
    sums.forEach(v=>v.normalize());
    for(let i=0;i<p.count;i++){const v=sums.get(keys[i]);normals.setXYZ(i,v.x,v.y,v.z);}
    return g;
  }
  function extrude(shape,depth=.025,bevel=.008) {
    const g=new THREE.ExtrudeGeometry(shape,{depth,curveSegments:14,steps:1,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:6});
    g.translate(0,0,-depth/2);smoothNormals(g);return geo(g);
  }
  function bulge(g,rx,ry,depth) {
    const p=g.attributes.position;
    for(let i=0;i<p.count;i++)if(p.getZ(i)>0){
      const ax=clamp01(1-Math.pow(Math.abs(p.getX(i))/rx,2)),ay=clamp01(1-Math.pow(Math.abs(p.getY(i))/ry,4));
      p.setZ(i,p.getZ(i)+depth*ax*ay);
    }
    smoothNormals(g);g.computeBoundingSphere();return g;
  }
  const clamp01=x=>THREE.MathUtils.clamp(x,0,1);
  // Rounded box with analytic normals, continuous across all six face seams.
  function softBox(w,h,d,r,segments=8) {
    r=Math.min(r,w*.499,h*.499,d*.499);
    const g=new THREE.BoxGeometry(w,h,d,segments,segments,segments),p=g.attributes.position,ns=g.attributes.normal;
    const inner=new THREE.Vector3(w/2-r,h/2-r,d/2-r),v=new THREE.Vector3(),q=new THREE.Vector3(),normal=new THREE.Vector3();
    for(let i=0;i<p.count;i++){
      v.fromBufferAttribute(p,i);q.set(THREE.MathUtils.clamp(v.x,-inner.x,inner.x),THREE.MathUtils.clamp(v.y,-inner.y,inner.y),THREE.MathUtils.clamp(v.z,-inner.z,inner.z));
      normal.subVectors(v,q).normalize();v.copy(q).addScaledVector(normal,r);p.setXYZ(i,v.x,v.y,v.z);ns.setXYZ(i,normal.x,normal.y,normal.z);
    }
    g.computeBoundingSphere();return geo(g);
  }
  const orb=(name,r,scale,m,parent,pos)=>{const o=mesh(name,geo(new THREE.SphereGeometry(r,20,14)),m,parent,pos);o.scale.set(...scale);return o;};
  function line(name,points,r,m,parent) {
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    return mesh(name,geo(new THREE.TubeGeometry(curve,Math.max(8,points.length*4),r,5,false)),m,parent);
  }
  function outline(name,shape,z,r,m,parent) {
    const pts=shape.getPoints(16).map(p=>[p.x,p.y,z]);return line(name,pts,r,m,parent);
  }
  const root=group('Steeve');root.userData={modelVersion:'steeve-guide-v1.0',frontAxis:'+Z',units:'arbitrary; total height 3.8',reference:'references/01-corps-face-trois-quarts-profil.png'};
  const body=group('body',root);
  const head=group('head',body,[0,3.065,0]);
  mesh('rounded-pearl-head',softBox(1.8,1.47,.98,.30,16),shell,head);
  // A distinct raised lens and a narrow polished rim, as in the guide profile.
  const outer=roundPath(1.744,1.412,.31),hole=roundPath(1.635,1.303,.265);
  const holePath=new THREE.Path();holePath.setFromPoints(hole.getPoints(20).reverse());outer.holes.push(holePath);
  mesh('continuous-polished-rim',extrude(outer,.047,.013),rim,head,[0,0,.516]);
  mesh('raised-milky-face',bulge(extrude(roundPath(1.49,1.157,.213),.028,.075),.83,.66,.028),lens,head,[0,0,.535]);
  const face=group('face',head,[0,0,.67]);
  const eyeGeometry=bulge(extrude(roundPath(.16,.345,.075),.045,.019),.10,.20,.022);
  // Eye groups allow gaze and blinks independently of the head.
  const eyeLeft=group('eye-left',face,[-.381,-.013,0]),eyeRight=group('eye-right',face,[.381,-.013,0]);
  for(const [g,id] of [[eyeLeft,'left'],[eyeRight,'right']]){
    mesh(`${id}-eye`,eyeGeometry,eye,g);
  }
  const mouth=group('mouth',face,[0,-.34,.006]);
  const smile=new THREE.Shape();smile.moveTo(-.135,.025);smile.quadraticCurveTo(0,.004,.135,.025);
  smile.bezierCurveTo(.15,-.018,.08,-.073,0,-.073);smile.bezierCurveTo(-.08,-.073,-.15,-.018,-.135,.025);smile.closePath();
  mesh('sculpted-smile',extrude(smile,.033,.009),eye,mouth);
  mesh('forehead-minus',softBox(.178,.035,.035,.017,6),marks,face,[-.454,.443,-.008]);
  const plus=poly([[-.017,-.071],[.017,-.071],[.017,-.017],[.071,-.017],[.071,.017],[.017,.017],[.017,.071],[-.017,.071],[-.017,.017],[-.071,.017],[-.071,-.017],[-.017,-.017]]);
  mesh('forehead-plus',extrude(plus,.024,.006),marks,face,[.479,.443,-.006]);
  const sideMark=mesh('forehead-slim-mark',softBox(.021,.132,.026,.01,5),rim,face,[.713,.438,-.034]);sideMark.rotation.z=.16;

  const torso=group('torso',body,[0,1.75,0]);
  const jacketOutline=new THREE.Shape();jacketOutline.moveTo(-.51,-.64);
  jacketOutline.quadraticCurveTo(-.56,-.64,-.54,-.47);jacketOutline.quadraticCurveTo(-.49,-.08,-.55,.33);
  jacketOutline.quadraticCurveTo(-.55,.52,-.43,.55);jacketOutline.lineTo(.43,.55);
  jacketOutline.quadraticCurveTo(.55,.52,.55,.33);jacketOutline.quadraticCurveTo(.49,-.08,.54,-.47);jacketOutline.quadraticCurveTo(.56,-.64,.51,-.64);jacketOutline.closePath();
  mesh('tailored-jacket-core',extrude(jacketOutline,.42,.09),cloth,torso);
  mesh('white-neck',softBox(.3,.15,.31,.05,6),shirt,torso,[0,.59,-.025]);
  // White V-shaped shirt fills the opening, black tie sits above it.
  const shirtShape=poly([[-.245,.552],[.245,.552],[.19,.23],[0,-.20],[-.19,.23]]);
  mesh('shirt-front',extrude(shirtShape,.025,.007),shirt,torso,[0,0,.337]);
  const collar=poly([[-.21,.552],[-.025,.495],[-.105,.31],[-.275,.49]]);
  mesh('shirt-collar-left',extrude(collar,.027,.009),shirt,torso,[0,0,.449]);
  const collarR=poly([[.21,.552],[.025,.495],[.105,.31],[.275,.49]].reverse());
  mesh('shirt-collar-right',extrude(collarR,.027,.009),shirt,torso,[0,0,.449]);
  const tie=group('tie',torso,[0,0,.398]);
  mesh('silk-knot',extrude(poly([[-.075,.495],[.075,.495],[.058,.36],[-.058,.36]]),.065,.014),tieMat,tie);
  mesh('silk-tie',extrude(poly([[-.053,.36],[.053,.36],[.083,.06],[0,-.16],[-.083,.06]]),.041,.012),tieMat,tie);
  // Two separate notched lapels; underlap and rounded tails preserve the silhouette.
  const lp=[[-.435,.49],[-.247,.555],[-.13,.33],[.014,-.19],[-.377,.105],[-.293,.205],[-.421,.27]];
  const leftLapel=poly(lp),rightLapel=poly(lp.map(([x,y])=>[-x,y]).reverse());
  mesh('notched-lapel-left',extrude(leftLapel,.044,.016),lapelMat,torso,[0,0,.386]);
  mesh('notched-lapel-right',extrude(rightLapel,.044,.016),lapelMat,torso,[0,0,.378]);
  line('lapel-left-stitch',[[-.411,.474,.449],[-.386,.276,.449],[-.254,.205,.449],[-.345,.107,.449],[-.012,-.153,.449]],.0023,seam,torso);
  line('lapel-right-stitch',[[.411,.474,.44],[.386,.276,.44],[.254,.205,.44],[.345,.107,.44],[.036,-.148,.44]],.0023,seam,torso);
  line('jacket-front-opening',[[.022,-.255,.339],[.018,-.475,.339],[.068,-.617,.337],[.17,-.648,.331]],.004,seam,torso);
  for(const side of [-1,1]){
    const pocket=roundPath(.247,.143,.022),p=group(`pocket-${side<0?'left':'right'}`,torso,[side*.372,-.30,.34]);
    mesh('pocket-flap',extrude(pocket,.022,.01),lapelMat,p);
    outline('pocket-topstitch',roundPath(.221,.116,.014),.025,.0024,seam,p);
  }
  const button=mesh('single-black-jacket-button',geo(new THREE.CylinderGeometry(.044,.046,.020,20)),marks,torso,[.016,-.235,.358]);button.rotation.x=Math.PI/2;
  const thread=mat('Button thread',{color:'#535752',roughness:.9});
  for(const x of [-.012,.012])for(const y of [-.012,.012])orb('button-hole',.004,[1,1,.35],soleMat,torso,[.016+x,-.235+y,.373]);
  line('button-thread',[[-.001,-.249,.375],[.029,-.222,.375]],.002,thread,torso);

  function arm(side) {
    const id=side<0?'left':'right',a=group(`arm-${id}`,body,[side*.59,2.18,-.005]);
    a.rotation.z=side*.19;
    const upper=mesh(`${id}-upper-sleeve`,softBox(.324,.58,.38,.14,8),cloth,a,[0,-.22,0]);
    const f=group(`forearm-${id}`,a,[0,-.46,0]);
    mesh(`${id}-lower-sleeve`,softBox(.306,.47,.355,.115,8),cloth,f,[0,-.19,0]);
    const cuff=mesh(`${id}-dark-cuff-gap`,geo(new THREE.CylinderGeometry(.147,.145,.025,20)),soleMat,f,[0,-.432,.0]);cuff.scale.z=1.09;
    const cuffSeam=[];for(let i=0;i<=24;i++){let t=i/24*Math.PI*2;cuffSeam.push([Math.cos(t)*.151,-.409,Math.sin(t)*.168]);}
    line(`${id}-cuff-seam`,cuffSeam,.003,seam,f);
    const hand=group(`hand-${id}`,f,[0,-.553,.023]);
    // One rounded mitten, not disconnected spheres. Inward thumb is part of the mesh.
    const mitten=new THREE.Shape();mitten.moveTo(-.09,.13);
    mitten.bezierCurveTo(-.14,.09,-.15,.02,-.145,-.05);
    mitten.bezierCurveTo(-.14,-.17,.035,-.19,.065,-.12);
    mitten.bezierCurveTo(.09,-.07,.04,-.055,.015,-.083);
    mitten.bezierCurveTo(-.035,-.11,-.048,-.02,-.005,.013);
    mitten.bezierCurveTo(.027,.042,.047,-.02,.092,-.006);
    mitten.bezierCurveTo(.14,.012,.11,.105,.071,.139);
    mitten.bezierCurveTo(.026,.17,-.05,.17,-.09,.13);mitten.closePath();
    const handMesh=mesh(`${id}-sculpted-mitten`,extrude(mitten,.148,.028),glove,hand,[0,-.025,.012]);
    if(side>0)handMesh.rotation.y=Math.PI;
    return {arm:a,forearm:f,hand};
  }
  const al=arm(-1),ar=arm(1);
  function leg(side) {
    const id=side<0?'left':'right',l=group(`leg-${id}`,root,[side*.299,1.19,-.015]);
    mesh(`${id}-trouser`,softBox(.415,1.025,.433,.074,7),cloth,l,[0,-.443,0]);
    line(`${id}-trouser-front-crease`,[[0,.015,.223],[0,-.38,.228],[0,-.88,.225]],.0026,lapelMat,l);
    line(`${id}-trouser-hem`,[[-.17,-.925,.205],[0,-.938,.223],[.17,-.925,.205]],.003,seam,l);
    const foot=group(`shoe-${id}`,l,[side*.022,-1.095,.128]);
    mesh(`${id}-rubber-sole`,softBox(.51,.088,.785,.04,8),soleMat,foot,[0,-.049,.075]);
    const upper=mesh(`${id}-leather-upper`,softBox(.487,.29,.737,.139,10),leather,foot,[0,.092,.072]);
    line(`${id}-toe-cap-seam`,[[-.219,.135,.29],[-.17,.206,.282],[0,.235,.278],[.17,.206,.282],[.219,.135,.29]],.003,soleMat,foot);
    for(let k=0;k<2;k++)line(`${id}-lace-${k}`,[[-.077,.231-k*.007,-.085+k*.065],[0,.241-k*.006,-.078+k*.065],[.077,.231-k*.007,-.085+k*.065]],.006,soleMat,foot);
    return l;
  }
  const legLeft=leg(-1),legRight=leg(1);
  // ---- Expressions Logisorama : volumes noirs supplémentaires, masqués par défaut ----
  const arc=(name,points,parent,r=.024)=>{const o=line(name,points,r,eye,parent);o.visible=false;return o;};
  // Yeux rieurs (∩) et yeux fermés (∪), dans les groupes des yeux : ils suivent regard et clignement.
  const happyEyes=[eyeLeft,eyeRight].map((g,i)=>arc(`happy-eye-${i}`,[[-.085,-.045,.03],[-.045,.03,.035],[0,.06,.035],[.045,.03,.035],[.085,-.045,.03]],g));
  const sleepEyes=[eyeLeft,eyeRight].map((g,i)=>arc(`sleep-eye-${i}`,[[-.085,.02,.03],[-.045,-.04,.035],[0,-.058,.035],[.045,-.04,.035],[.085,.02,.03]],g));
  const brows=group('brows',face,[0,0,0]);
  const browLeft=group('brow-left',brows,[-.381,.255,.01]),browRight=group('brow-right',brows,[.381,.255,.01]);
  for(const g of [browLeft,browRight])mesh('brow',softBox(.19,.036,.04,.017,5),eye,g);
  brows.visible=false;
  const mouthO=mesh('mouth-o',geo(new THREE.TorusGeometry(.058,.022,10,28)),eye,mouth,[0,-.025,.01]);mouthO.scale.y=1.25;mouthO.visible=false;
  const mouthFlat=mesh('mouth-flat',softBox(.17,.036,.04,.017,5),eye,mouth,[0,-.012,.01]);mouthFlat.visible=false;
  const frown=mesh('mouth-frown',extrude(smile,.033,.009),eye,mouth,[0,-.06,0]);frown.rotation.z=Math.PI;frown.scale.set(.75,.6,1);frown.visible=false;
  const dots=group('thinking-dots',mouth,[0,-.02,.01]);dots.visible=false;
  for(const x of [-.07,0,.07])orb('thinking-dot',.024,[1,1,.6],eye,dots,[x,0,0]);
  const smileMesh=mouth.children.find(o=>o.name==='sculpted-smile');
  const openEyeMeshes=[eyeLeft,eyeRight].map(g=>g.children.find(o=>o.name.endsWith('-eye')));

  const parts={body,head,face,eyeLeft,eyeRight,mouth,torso,tie,armLeft:al.arm,armRight:ar.arm,forearmLeft:al.forearm,forearmRight:ar.forearm,handLeft:al.hand,handRight:ar.hand,legLeft,legRight,brows,browLeft,browRight};
  const basePose=new Map();root.traverse(o=>basePose.set(o,{position:o.position.clone(),quaternion:o.quaternion.clone(),scale:o.scale.clone()}));
  function resetPose(){root.traverse(o=>{const p=basePose.get(o);if(p){o.position.copy(p.position);o.quaternion.copy(p.quaternion);o.scale.copy(p.scale);}});}
  function setSmile(amount=0){const v=THREE.MathUtils.clamp(amount,0,1);mouth.scale.set(1+v*.18,1+v*.45,1);}
  function setBlink(amount=0){const sy=Math.max(.09,1-THREE.MathUtils.clamp(amount,0,1));eyeLeft.scale.y=eyeRight.scale.y=sy;}
  /**
   * Expressions : neutre (sourire du personnage), smile, laugh, wink, surprise, sad, oops, curious, thinking,
   * sleep, serious. Seules les pièces du visage changent ; la tête, la tenue et les proportions restent identiques.
   */
  function setExpression(name='neutre'){
    const e=String(name);
    const laugh=e==='laugh',wink=e==='wink',sleep=e==='sleep';
    openEyeMeshes[0].visible=!(laugh||sleep);
    openEyeMeshes[1].visible=!(laugh||sleep||wink);
    happyEyes[0].visible=laugh;
    happyEyes[1].visible=laugh||wink;
    sleepEyes.forEach(o=>{o.visible=sleep;});
    const o=['surprise','oops','curious'].includes(e);
    smileMesh.visible=!(o||['sad','thinking','sleep','serious'].includes(e));
    mouthO.visible=o;
    mouthO.scale.set(e==='surprise'?1.25:.8,e==='surprise'?1.55:1,1);
    frown.visible=e==='sad';
    dots.visible=e==='thinking';
    mouthFlat.visible=e==='sleep'||e==='serious';
    mouthFlat.scale.x=e==='sleep'?.55:1;
    brows.visible=['surprise','sad','oops','curious','thinking','serious'].includes(e);
    // Sourcils : levés (surprise), en accent (tristesse, oups), un seul levé (curiosité, réflexion), froncés (sérieux).
    const b={surprise:[.06,0,0],sad:[0,-.32,.32],oops:[.02,-.22,.22],curious:[0,.0,.28],thinking:[0,.22,-.12],serious:[-.03,.18,-.18]}[e]||[0,0,0];
    browLeft.position.y=.255+b[0];browRight.position.y=.255+b[0]+(e==='curious'?.05:e==='thinking'?.04:0);
    browLeft.rotation.z=b[1];browRight.rotation.z=b[2];
    setSmile(laugh?1:['smile','happy','coucou','sourire'].includes(e)?.75:0);
    if(laugh)mouth.scale.set(1.35,2.1,1);
    mouth.userData.expression=e;
  }
  setExpression('neutre');
  // Pose de repos (après les ajouts) pour resetPose.
  root.traverse(o=>basePose.set(o,{position:o.position.clone(),quaternion:o.quaternion.clone(),scale:o.scale.clone()}));
  return {root,parts,...parts,basePose,geometries,materials,textures,setSmile,setBlink,setExpression,resetPose,
    dispose(){geometries.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());textures.forEach(x=>x.dispose());}};
}
