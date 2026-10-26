import * as THREE from 'three';
import { buildWardrobe } from './steeve-wardrobe.js';
import { buildArms } from './steeve-limbs.js';

// Personnage : pack « Steeve-personnage-seul-Claude 3 » (Steeve V2, Three.js 0.186), adapté à la version de
// Three.js du projet (0.133, une seule version dans l'application) : couleurs données en sRGB puis converties
// en linéaire, noms de propriétés de l'API 0.133 (sheenTint, specularTint, attenuationTint).
// Ajouts Logisorama : expressions déjà utilisées par les animations (rire, clin d'œil, surprise, tristesse, oups,
// curiosité, réflexion, sommeil, sérieux), en volumes noirs comme les yeux et la bouche, masqués par défaut.
const COLOR_KEYS = { color: 'color', sheenColor: 'sheenTint', specularColor: 'specularTint', attenuationColor: 'attenuationTint' };

export function srgb(value) {
  return (value instanceof THREE.Color ? value.clone() : new THREE.Color(value)).convertSRGBToLinear();
}

/**
 * STEEVE V2 · rounded, sewn and sculpted from the approved reference sheets.
 * Y-up, front +Z, feet at 0; height 3.8 model units, not metres.
 * Real closed meshes, a transform rig and two continuously skinned sleeves.
 * All materials and the woven texture are local, deterministic original assets.
 */
export function createSteeveModel() {
  const geometries=new Set(),materials=new Set(),textures=new Set();
  const geo=g=>(geometries.add(g),g);
  const mat=(name,p)=>{
    const adapted={};
    for(const [key,value] of Object.entries(p))adapted[key in COLOR_KEYS?COLOR_KEYS[key]:key]=key in COLOR_KEYS?srgb(value):value;
    const m=new THREE.MeshPhysicalMaterial(adapted);m.name=name;materials.add(m);return m;
  };
  // Broad irregular fibre bundles plus a fine, subtly alternating weave.
  // Tileable frequency components avoid visible seams, including after GLB export.
  const n=256,data=new Uint8Array(n*n*4);
  const height=(x,y)=>{
    const u=x/n*Math.PI*2,v=y/n*Math.PI*2;
    const warp=.10*Math.sin(16*u+.44*Math.sin(5*v))+.10*Math.sin(16*v+.35*Math.sin(3*u));
    const grain=.06*Math.sin(29*u+13*v)+.04*Math.sin(37*v-11*u)+.05*Math.sin(7*u+9*v);
    return warp+grain;
  };
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const dx=(height(x+1,y)-height(x-1,y))*1.9,dy=(height(x,y+1)-height(x,y-1))*1.9;
    const normal=new THREE.Vector3(-dx,-dy,1).normalize(),k=(y*n+x)*4;
    data[k]=Math.round((normal.x*.5+.5)*255);data[k+1]=Math.round((normal.y*.5+.5)*255);
    data[k+2]=Math.round((normal.z*.5+.5)*255);data[k+3]=255;
  }
  const weave=new THREE.DataTexture(data,n,n,THREE.RGBAFormat,THREE.UnsignedByteType);
  weave.name='Ivory woven fabric — original seamless 256px normal';
  weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.repeat.set(6,6);
  weave.generateMipmaps=true;weave.minFilter=THREE.LinearMipmapLinearFilter;
  weave.magFilter=THREE.LinearFilter;weave.anisotropy=4;weave.needsUpdate=true;textures.add(weave);
  const shell=mat('Pearlescent porcelain shell',{color:'#f8f9f6',roughness:.18,metalness:0,clearcoat:1,clearcoatRoughness:.09,ior:1.46});
  const lens=mat('Convex milky glass face',{color:'#fafbf8',roughness:.16,metalness:0,clearcoat:1,clearcoatRoughness:.065});
  const rim=mat('Polished continuous white rim',{color:'#fcfcfa',roughness:.19,metalness:.03,clearcoat:1,clearcoatRoughness:.08});
  const eye=mat('Sculpted black enamel eyes and smile',{color:'#080a09',roughness:.23,metalness:.02,clearcoat:1,clearcoatRoughness:.095});
  const marks=mat('Forehead enamel symbols',{color:'#222523',roughness:.30,metalness:.05,clearcoat:.5});
  const seam=mat('Ivory topstitch',{color:'#d6d2c7',roughness:.96});
  const cloth=mat('Ivory woven wool suit',{color:'#e7e1d4',roughness:.90,metalness:0,sheen:.65,sheenColor:new THREE.Color('#fff8e9'),sheenRoughness:.85,normalMap:weave,normalScale:new THREE.Vector2(.42,.42)});
  const lapel=mat('Curved ivory woven lapels',{color:'#eee8db',roughness:.84,sheen:.55,sheenColor:new THREE.Color('#fff9ed'),sheenRoughness:.8,normalMap:weave,normalScale:new THREE.Vector2(.40,.40)});
  const shirt=mat('Fresh white cotton shirt',{color:'#fffefd',roughness:.82,sheen:.2});
  const tieMat=mat('Charcoal satin tie',{color:'#171b1a',roughness:.42,sheen:.5,sheenColor:new THREE.Color('#6f7875'),sheenRoughness:.45});
  const glove=mat('Soft sculpted white gloves',{color:'#f6f5f0',roughness:.44,clearcoat:.08});
  const leather=mat('Rounded polished black leather shoes',{color:'#111514',roughness:.29,clearcoat:.65,clearcoatRoughness:.19});
  const sole=mat('Black rubber soles',{color:'#101311',roughness:.84});

  const group=(name,parent,pos=[0,0,0])=>{const g=new THREE.Group();g.name=name;g.position.set(...pos);parent?.add(g);return g;};
  const mesh=(name,g,m,parent,pos=[0,0,0])=>{const o=new THREE.Mesh(g,m);o.name=name;o.position.set(...pos);o.castShadow=o.receiveShadow=true;parent.add(o);return o;};
  const spow=(v,p)=>Math.sign(v)*Math.pow(Math.abs(v),p);

  // Generalised cushion surface, continuously curved over the front, sides and
  // corners. Analytic gradient normals avoid the flat caps of beveled extrusions.
  function cushion(a,b,c,p=4.6,q=3.2,segments=80,rings=36){
    const positions=[],normals=[],uv=[],indices=[];
    for(let j=0;j<=rings;j++){
      const phi=-Math.PI/2+j/rings*Math.PI;
      const radius=Math.pow(Math.max(0,Math.cos(phi)),2/q),z=c*spow(Math.sin(phi),2/q);
      for(let i=0;i<=segments;i++){
        const theta=i/segments*Math.PI*2;
        const x=a*radius*spow(Math.cos(theta),2/p),y=b*radius*spow(Math.sin(theta),2/p);
        positions.push(x,y,z);uv.push(i/segments,j/rings);
        const sum=Math.pow(Math.abs(x/a),p)+Math.pow(Math.abs(y/b),p);
        const common=sum>1e-12?Math.pow(sum,q/p-1):0;
        const normal=new THREE.Vector3(
          Math.sign(x)*Math.pow(Math.abs(x/a),p-1)*common/a,
          Math.sign(y)*Math.pow(Math.abs(y/b),p-1)*common/b,
          Math.sign(z)*Math.pow(Math.abs(z/c),q-1)/c).normalize();
        normals.push(normal.x,normal.y,normal.z);
        if(j<rings&&i<segments){const k=j*(segments+1)+i,l=k+segments+1;indices.push(k,k+1,l,k+1,l+1,l);}
      }
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);
    g.computeBoundingSphere();return geo(g);
  }
  function tube(name,points,r,m,parent,closed=false){
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),closed,'centripetal');
    return mesh(name,geo(new THREE.TubeGeometry(curve,Math.max(32,points.length*2),r,6,closed)),m,parent);
  }
  // Dense, closed, softly convex smile, not a flat black decal.
  function smileGeometry(){
    const s=new THREE.Shape();s.moveTo(-.135,.022);s.quadraticCurveTo(0,.002,.135,.022);
    s.bezierCurveTo(.152,-.015,.083,-.075,0,-.075);s.bezierCurveTo(-.083,-.075,-.152,-.015,-.135,.022);
    const pts=s.getSpacedPoints(64),positions=[],uv=[],indices=[];
    const centerY=-.022,rings=20,segments=64;
    for(let j=0;j<=rings;j++){
      const t=-Math.PI/2+j/rings*Math.PI,r=Math.cos(t);
      for(let i=0;i<=segments;i++){
        const p=pts[i];positions.push(p.x*r,centerY+(p.y-centerY)*r,Math.sin(t)*.031);
        uv.push(i/segments,j/rings);
        if(j<rings&&i<segments){const a=j*(segments+1)+i,b=a+segments+1;indices.push(a,b,a+1,a+1,b,b+1);}
      }
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
    const norm=g.attributes.normal;
    for(let j=0;j<=rings;j++){const a=j*(segments+1),b=a+segments,n=new THREE.Vector3().fromBufferAttribute(norm,a).add(new THREE.Vector3().fromBufferAttribute(norm,b)).normalize();norm.setXYZ(a,n.x,n.y,n.z);norm.setXYZ(b,n.x,n.y,n.z);}
    return geo(g);
  }
  const root=group('Steeve');root.userData={modelVersion:'steeve-guide-v2.0',frontAxis:'+Z',units:'arbitrary; total height approx 3.8',reference:'references/01-corps-face-trois-quarts-profil.png',construction:'curved cushions, tailored garment surfaces, continuous skinned sleeves, volumetric implicit gloves'};
  const body=group('body',root),head=group('head',body,[0,3.065,0]);
  mesh('soft-pearl-head-shell',cushion(.90,.735,.51,4.6,3.1),shell,head,[0,0,-.015]);
  mesh('convex-milky-face',cushion(.869,.704,.35,4.6,2.5),lens,head,[0,0,.24]);
  const rimPoints=[];
  for(let i=0;i<96;i++){const t=i/96*Math.PI*2;rimPoints.push([.870*spow(Math.cos(t),2/4.6),.705*spow(Math.sin(t),2/4.6),.239]);}
  const faceRim=tube('fine-continuous-face-rim',rimPoints,.004,rim,head,true);
  // A sub-pixel polished seam must not project a noisy shadow over its own lens.
  faceRim.castShadow=false;faceRim.receiveShadow=false;
  const face=group('face',head);
  const faceZ=(x,y)=>.24+.35*Math.pow(Math.max(0,1-Math.pow(Math.pow(Math.abs(x/.869),4.6)+Math.pow(Math.abs(y/.704),4.6),2.5/4.6)),1/2.5);
  const eyeLeft=group('eye-left',face,[-.381,-.013,faceZ(-.381,-.013)+.017]);
  const eyeRight=group('eye-right',face,[.381,-.013,faceZ(.381,-.013)+.017]);
  eyeLeft.rotation.y=-.12;eyeRight.rotation.y=.12;
  const eyeGeometry=cushion(.104,.193,.058,3.5,2.6,48,24);
  mesh('left-raised-eye',eyeGeometry,eye,eyeLeft);mesh('right-raised-eye',eyeGeometry,eye,eyeRight);
  const mouth=group('mouth',face,[0,-.34,faceZ(0,-.34)+.011]);
  mesh('soft-sculpted-smile',smileGeometry(),eye,mouth);
  function pill(name,w,h,d,x,y,material){return mesh(name,cushion(w/2,h/2,d/2,3.3,2.3,32,16),material,face,[x,y,faceZ(x,y)+.012]);}
  pill('forehead-minus',.178,.032,.035,-.454,.443,marks);
  pill('forehead-plus-horizontal',.139,.029,.035,.479,.443,marks);
  pill('forehead-plus-vertical',.029,.139,.036,.479,.443,marks);
  const sideMark=pill('forehead-slim-mark',.021,.132,.025,.713,.438,rim);sideMark.rotation.z=.16;

  const {torso,tie,legLeft,legRight}=buildWardrobe({THREE,root,body,materials:{cloth,lapel,shirt,tie:tieMat,leather,sole,seam,marks}});
  const arms=buildArms({THREE,root,body,group,mesh,geo,materials:{cloth,glove,shirt,sole,seam}});
  const {armLeft,armRight,forearmLeft,forearmRight,handLeft,handRight}=arms;
  // ---- Expressions Logisorama : volumes noirs supplémentaires, masqués par défaut ----
  const hidden=o=>{o.visible=false;return o;};
  const arc=(name,points,parent)=>hidden(tube(name,points,.022,eye,parent));
  // Yeux rieurs (∩) et yeux fermés (∪), dans les groupes des yeux : ils suivent le regard et le clignement.
  const happyEyes=[eyeLeft,eyeRight].map((g,i)=>arc(`happy-eye-${i}`,[[-.085,-.045,.004],[-.045,.03,.01],[0,.06,.012],[.045,.03,.01],[.085,-.045,.004]],g));
  const sleepEyes=[eyeLeft,eyeRight].map((g,i)=>arc(`sleep-eye-${i}`,[[-.085,.02,.004],[-.045,-.04,.01],[0,-.058,.012],[.045,-.04,.01],[.085,.02,.004]],g));
  const brows=group('brows',face);
  const browLeft=group('brow-left',brows,[-.381,.255,faceZ(-.381,.255)+.012]),browRight=group('brow-right',brows,[.381,.255,faceZ(.381,.255)+.012]);
  browLeft.rotation.y=-.12;browRight.rotation.y=.12;
  const browGeometry=cushion(.095,.018,.02,3.3,2.3,32,16);
  for(const g of [browLeft,browRight])mesh('brow',browGeometry,eye,g);
  brows.visible=false;
  const mouthO=hidden(mesh('mouth-o',geo(new THREE.TorusGeometry(.058,.022,12,32)),eye,mouth,[0,-.025,.004]));mouthO.scale.y=1.25;
  const mouthFlat=hidden(mesh('mouth-flat',cushion(.085,.018,.02,3.3,2.3,32,16),eye,mouth,[0,-.012,.004]));
  const frown=hidden(mesh('mouth-frown',smileGeometry(),eye,mouth,[0,-.06,0]));frown.rotation.z=Math.PI;frown.scale.set(.75,.6,1);
  const dots=hidden(group('thinking-dots',mouth,[0,-.02,.004]));
  const dotGeometry=geo(new THREE.SphereGeometry(.024,20,14));
  for(const x of [-.07,0,.07]){const d=mesh('thinking-dot',dotGeometry,eye,dots,[x,0,0]);d.scale.z=.6;}
  const smileMesh=mouth.children.find(o=>o.name==='soft-sculpted-smile');
  const openEyeMeshes=[eyeLeft,eyeRight].map(g=>g.children.find(o=>o.name.endsWith('-raised-eye')));

  const parts={body,head,face,eyeLeft,eyeRight,mouth,torso,tie,armLeft,armRight,forearmLeft,forearmRight,handLeft,handRight,legLeft,legRight,brows,browLeft,browRight};
  root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});
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
    mouthFlat.visible=sleep||e==='serious';
    mouthFlat.scale.x=sleep?.55:1;
    brows.visible=['surprise','sad','oops','curious','thinking','serious'].includes(e);
    // Sourcils : levés (surprise), en accent (tristesse, oups), un seul levé (curiosité, réflexion), froncés (sérieux).
    const b={surprise:[.06,0,0],sad:[0,-.32,.32],oops:[.02,-.22,.22],curious:[0,0,.28],thinking:[0,.22,-.12],serious:[-.03,.18,-.18]}[e]||[0,0,0];
    browLeft.position.y=.255+b[0];browRight.position.y=.255+b[0]+(e==='curious'?.05:e==='thinking'?.04:0);
    browLeft.rotation.z=b[1];browRight.rotation.z=b[2];
    setSmile(laugh?1:['smile','happy','coucou','sourire'].includes(e)?.75:0);
    if(laugh)mouth.scale.set(1.35,2.1,1);
    mouth.userData.expression=e;
  }
  setExpression('neutre');
  // Pose de repos (après les ajouts et l'expression neutre) pour resetPose.
  root.traverse(o=>basePose.set(o,{position:o.position.clone(),quaternion:o.quaternion.clone(),scale:o.scale.clone()}));
  return {root,parts,...parts,basePose,geometries,materials,textures,skeletons:arms.skeletons,setSmile,setBlink,setExpression,resetPose,
    dispose(){arms.skeletons.forEach(s=>s.dispose());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
