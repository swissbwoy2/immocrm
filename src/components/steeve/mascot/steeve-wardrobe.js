/**
 * Steeve's tailored wardrobe. Original analytic, curved, UV-mapped meshes.
 * Front +Z; the jacket is an open, thick shell rather than a bevelled box.
 * No third-party geometry or texture. Rig node names remain compatible with v1.
 */
export function buildWardrobe(ctx) {
  const {THREE,root,body,materials:m}=ctx;
  const register=g=>ctx.geo?ctx.geo(g):g;
  const group=(name,parent,pos=[0,0,0])=>{
    const o=new THREE.Group();o.name=name;o.position.set(...pos);parent.add(o);return o;
  };
  const mesh=(name,g,mat,parent,pos=[0,0,0])=>{
    const o=new THREE.Mesh(register(g),mat);o.name=name;o.position.set(...pos);
    o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
  };
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const mix=(a,b,t)=>a+(b-a)*t;
  // C1 smooth interpolation avoids the horizontal facets of stepped lofts.
  function sample(keys,y,col=1){
    if(y<=keys[0][0])return keys[0][col];
    if(y>=keys[keys.length-1][0])return keys[keys.length-1][col];
    let i=0;while(keys[i+1][0]<y)i++;
    const a=keys[i],b=keys[i+1],p=keys[Math.max(0,i-1)],n=keys[Math.min(keys.length-1,i+2)];
    const d=b[0]-a[0],t=(y-a[0])/d;
    const ma=(b[col]-p[col])/(b[0]-p[0]),mb=(n[col]-a[col])/(n[0]-a[0]);
    return (2*t*t*t-3*t*t+1)*a[col]+(t*t*t-2*t*t+t)*d*ma+(-2*t*t*t+3*t*t)*b[col]+(t*t*t-t*t)*d*mb;
  }
  function geometry(pos,indices,uv){
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
    // Weld normals at periodic UV seams without destroying the UV split.
    const p=g.attributes.position,n=g.attributes.normal,sums=new Map(),keys=[];
    for(let i=0;i<p.count;i++){
      const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e6)).join(',');keys.push(key);
      if(!sums.has(key))sums.set(key,new THREE.Vector3());sums.get(key).add(new THREE.Vector3(n.getX(i),n.getY(i),n.getZ(i)));
    }
    sums.forEach(v=>v.normalize());for(let i=0;i<p.count;i++){const v=sums.get(keys[i]);n.setXYZ(i,v.x,v.y,v.z);}
    g.computeBoundingBox();g.computeBoundingSphere();return g;
  }
  function tube(name,pts,r,mat,parent,segments=40){
    const path=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));
    return mesh(name,new THREE.TubeGeometry(path,segments,r,5,false),mat,parent);
  }
  const orb=(name,scale,mat,parent,pos)=>{
    const o=mesh(name,new THREE.SphereGeometry(1,16,10),mat,parent,pos);o.scale.set(...scale);return o;
  };
  function roundedPolygon(points,r=.018){
    const s=new THREE.Shape(),v=points.map(p=>new THREE.Vector2(...p)),corners=[];
    for(let i=0;i<v.length;i++){
      const a=v[(i+v.length-1)%v.length],b=v[i],c=v[(i+1)%v.length];
      const d=Math.min(r,a.distanceTo(b)*.26,c.distanceTo(b)*.26);
      corners.push([b.clone().lerp(a,d/a.distanceTo(b)),b,b.clone().lerp(c,d/c.distanceTo(b))]);
    }
    s.moveTo(...corners[0][0].toArray());
    for(let i=0;i<corners.length;i++){const [a,b,c]=corners[i];if(i)s.lineTo(a.x,a.y);s.quadraticCurveTo(b.x,b.y,c.x,c.y);}
    s.closePath();return s;
  }
  // Curved cloth patch with real thickness. Every triangle is subdivided before
  // being conformed to the chest: no planar/floating lapel plates.
  function patch(name,shape,zfn,thickness,mat,parent,subdiv=2){
    const sg=new THREE.ShapeGeometry(shape,4),sp=sg.attributes.position,si=sg.index;
    let tris=[];
    for(let i=0;i<si.count;i+=3)tris.push([0,1,2].map(j=>{const k=si.getX(i+j);return [sp.getX(k),sp.getY(k)];}));
    sg.dispose();
    for(let k=0;k<subdiv;k++){
      const out=[];for(const [a,b,c] of tris){const ab=[(a[0]+b[0])/2,(a[1]+b[1])/2],bc=[(b[0]+c[0])/2,(b[1]+c[1])/2],ca=[(c[0]+a[0])/2,(c[1]+a[1])/2];out.push([a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]);}tris=out;
    }
    const pos=[],uv=[],idx=[],normal=[],lookup=new Map();
    const surfaceNormal=(x,y,side=1)=>{
      const e=.00015,dx=(zfn(x+e,y)-zfn(x-e,y))/(2*e),dy=(zfn(x,y+e)-zfn(x,y-e))/(2*e);
      return new THREE.Vector3(-dx*side,-dy*side,side).normalize();
    };
    const vert=(x,y,z,side)=>{
      const key=[x,y,z].map(v=>Math.round(v*1e7)).join(',')+':'+side;if(lookup.has(key))return lookup.get(key);
      const i=pos.length/3;pos.push(x,y,z);uv.push(x+.5,y+.65);normal.push(...surfaceNormal(x,y,side).toArray());lookup.set(key,i);return i;
    };
    for(const tr of tris){
      const a=tr.map(([x,y])=>vert(x,y,zfn(x,y)+thickness/2,1));
      const b=tr.map(([x,y])=>vert(x,y,zfn(x,y)-thickness/2,-1));idx.push(...a,b[2],b[1],b[0]);
    }
    const boundary=shape.getPoints(4);
    if(boundary[0].distanceTo(boundary.at(-1))<.000001)boundary.pop();
    let area=0;for(let i=0;i<boundary.length;i++){const a=boundary[i],b=boundary[(i+1)%boundary.length];area+=a.x*b.y-b.x*a.y;}
    const clockwise=area<0;
    // Side-wall vertices deliberately do not share their normals with the broad
    // cloth face. Mixing these normals made dark triangular corners in v2.
    const wall=(i,side)=>{
      const n=boundary.length,a=boundary[i],prev=boundary[(i+n-1)%n],next=boundary[(i+1)%n],dx=next.x-prev.x,dy=next.y-prev.y;
      const out=new THREE.Vector3(clockwise?-dy:dy,clockwise?dx:-dx,0).normalize();
      const no=surfaceNormal(a.x,a.y,side).multiplyScalar(.30).add(out).normalize();
      const j=pos.length/3;pos.push(a.x,a.y,zfn(a.x,a.y)+side*thickness/2);uv.push(a.x+.5,a.y+.65);normal.push(...no.toArray());return j;
    };
    for(let i=0;i<boundary.length;i++){
      const j=(i+1)%boundary.length,at=wall(i,1),ab=wall(i,-1),bt=wall(j,1),bb=wall(j,-1);
      if(clockwise)idx.push(at,bt,ab,bt,bb,ab);else idx.push(at,ab,bt,bt,ab,bb);
    }
    const g=geometry(pos,idx,uv);g.setAttribute('normal',new THREE.Float32BufferAttribute(normal,3));
    return mesh(name,g,mat,parent);
  }
  function stitch(name,shape,zfn,parent,mat=m.seam,r=.0017){
    const pts=shape.getPoints(5);if(pts[0].distanceTo(pts.at(-1))>.0001)pts.push(pts[0]);
    return tube(name,pts.map(p=>[p.x,p.y,zfn(p.x,p.y)]),r,mat,parent,Math.max(32,pts.length));
  }
  // Cross-section keys: y, half-width, half-depth, front opening half-width.
  const jacketKeys=[[-.645,.538,.287,.097],[-.57,.546,.307,.034],[-.40,.523,.318,.012],[-.22,.503,.332,.006],[.02,.514,.343,.074],[.24,.536,.325,.153],[.43,.517,.281,.213],[.555,.421,.228,.245]];
  const chestZ=(x,y)=>{
    const rx=sample(jacketKeys,y,1),rz=sample(jacketKeys,y,2);
    return rz*Math.pow(Math.max(.006,1-(x/rx)**2),.42)-.005;
  };
  const torso=group('torso',body,[0,1.75,0]);
  {
    const pos=[],uv=[],idx=[],N=44,H=24,stride=N+1,count=(H+1)*stride;
    for(let inner=0;inner<2;inner++)for(let j=0;j<=H;j++){
      const v=j/H,y=mix(-.645,.555,v),rx=sample(jacketKeys,y,1)-inner*.022,rz=sample(jacketKeys,y,2)-inner*.022;
      const opening=sample(jacketKeys,y,3),start=Math.asin(clamp(opening/(rx+inner*.022),0,.85));
      for(let i=0;i<=N;i++){
        const u=i/N,t=mix(start,Math.PI*2-start,u),cs=Math.cos(t),sn=Math.sin(t);
        const z=Math.sign(cs)*Math.pow(Math.abs(cs),.84)*rz-.005;
        const bottomLift=.031*Math.exp(-(Math.min(i,N-i)**2)/10)*Math.exp(-((v/.09)**2));
        const shoulderLift=.006*Math.sin(t)**2*Math.exp(-(((v-1)/.13)**2));
        pos.push(sn*rx,y+bottomLift+shoulderLift,z);uv.push(u,v);
      }
    }
    for(let inside=0;inside<2;inside++)for(let j=0;j<H;j++)for(let i=0;i<N;i++){
      const a=inside*count+j*stride+i,b=a+1,c=a+stride,d=c+1;
      if(!inside)idx.push(a,b,c,b,d,c);else idx.push(a,c,b,b,c,d);
    }
    // Seal the cloth thickness at the opening, shoulder and hem.
    for(let j=0;j<H;j++)for(const i of [0,N]){
      const a=j*stride+i,b=a+stride,ai=a+count,bi=b+count;
      if(i===0)idx.push(a,b,ai,b,bi,ai);else idx.push(a,ai,b,b,ai,bi);
    }
    for(let i=0;i<N;i++)for(const j of [0,H]){
      const a=j*stride+i,b=a+1,ai=a+count,bi=b+count;
      if(j===0)idx.push(a,ai,b,b,ai,bi);else idx.push(a,b,ai,b,bi,ai);
    }
    mesh('tailored-open-jacket-shell',geometry(pos,idx,uv),m.cloth,torso);
  }
  const neck=mesh('white-shirt-neck',new THREE.CylinderGeometry(.161,.169,.15,36,3),m.shirt,torso,[0,.568,-.035]);neck.scale.z=.86;
  const shirtShape=roundedPolygon([[-.25,.565],[.25,.565],[.173,.235],[.03,-.216],[-.03,-.216],[-.173,.235]],.024);
  patch('curved-white-shirt-front',shirtShape,(x,y)=>chestZ(x,y)-.010,.016,m.shirt,torso,2);
  // Collar points roll gently away from the neck and meet the tie knot.
  for(const side of [-1,1]){
    const id=side<0?'left':'right';
    let c=[[-.232,.557],[-.023,.507],[-.106,.341],[-.285,.507]];
    if(side>0)c=c.map(([x,y])=>[-x,y]).reverse();
    patch(`rolled-shirt-collar-${id}`,roundedPolygon(c,.019),(x,y)=>chestZ(x,y)+.052+.015*Math.sin(clamp((y-.34)/.22)*Math.PI),.018,m.shirt,torso,2);
  }
  const tie=group('tie',torso);
  const knot=roundedPolygon([[-.078,.493],[.078,.493],[.054,.368],[-.054,.368]],.025);
  patch('silk-tie-knot',knot,(x,y)=>chestZ(x,y)+.057+.030*(1-clamp((x/.088)**2)),.030,m.tie,tie,2);
  const blade=new THREE.Shape();blade.moveTo(-.048,.382);blade.quadraticCurveTo(-.073,.23,-.08,.083);blade.quadraticCurveTo(-.079,-.035,0,-.188);blade.quadraticCurveTo(.079,-.035,.08,.083);blade.quadraticCurveTo(.073,.23,.048,.382);blade.closePath();
  patch('soft-silk-tie-blade',blade,(x,y)=>chestZ(x,y)+.041+.023*(1-clamp((x/.091)**2)),.018,m.tie,tie,2);
  for(const side of [-1,1]){
    const id=side<0?'left':'right';
    let lp=[[-.244,.557],[-.433,.505],[-.452,.365],[-.326,.342],[-.412,.239],[-.019,-.211],[-.115,.049],[-.182,.283]];
    if(side>0)lp=lp.map(([x,y])=>[-x,y]).reverse();
    const s=roundedPolygon(lp,.015);
    const z=(x,y)=>chestZ(x,y)+.031+.014*Math.exp(-(((Math.abs(x)-.25)/.14)**2));
    patch(`soft-notched-lapel-${id}`,s,z,.020,m.lapel,torso,2);
    // Fine matching topstitch, never a dark graphic outline.
    stitch(`lapel-${id}-edge-stitch`,s,(x,y)=>z(x,y)+.011,torso,m.seam,.0015);
    const px=side*.365,py=-.302;
    const pocket=roundedPolygon([[px-.117,py+.071],[px+.117,py+.071],[px+.117,py-.064],[px-.117,py-.064]],.021);
    const pz=(x,y)=>chestZ(x,y)+.013+.006*Math.sin(clamp((y-(py-.064))/.135)*Math.PI);
    patch(`curved-pocket-flap-${id}`,pocket,pz,.018,m.lapel,torso,2);
    stitch(`pocket-${id}-fine-topstitch`,pocket,(x,y)=>pz(x,y)+.010,torso,m.seam,.0014);
    // A nearly invisible vertical side seam, conformed to the same shell.
    const sx=side*.494;
    tube(`jacket-${id}-side-seam`,[-.57,-.40,-.2,.0,.22,.37].map(y=>[sx,y,chestZ(sx,y)+.001]),.0015,m.seam,torso,26);
  }
  tube('jacket-centre-back-seam',[-.60,-.35,-.05,.22,.46].map(y=>[0,y,-sample(jacketKeys,y,2)-.007]),.0015,m.seam,torso,32);
  // Actual one-button fastening; four recessed holes, tiny thread cross.
  const by=-.235,bx=.018,bz=chestZ(bx,by)+.013;
  const button=orb('single-black-jacket-button',[.043,.043,.014],m.marks,torso,[bx,by,bz]);
  const ring=new THREE.TorusGeometry(.0355,.0025,6,28);mesh('jacket-button-raised-rim',ring,m.marks,torso,[bx,by,bz+.013]);
  for(const x of [-.009,.009])for(const y of [-.009,.009])orb('button-recess',[.0035,.0035,.0017],m.sole,torso,[bx+x,by+y,bz+.014]);
  tube('button-thread',[[bx-.008,by-.008,bz+.016],[bx+.008,by+.008,bz+.016]],.0014,m.thread||m.seam,torso,4);
  // The buttonhole is a short cloth-coloured slit, not a second button.
  tube('jacket-buttonhole',[[bx+.043,by,bz-.006],[bx+.082,by+.001,chestZ(bx+.082,by)+.006]],.0018,m.seam,torso,5);

  function closedLoft(name,keys,mat,parent,centre,N=44,H=22,shapeFn=null){
    const pos=[],uv=[],idx=[],y0=keys[0][0],y1=keys.at(-1)[0];
    for(let j=0;j<=H;j++){
      const v=j/H,y=mix(y0,y1,v),rx=Math.max(.0003,sample(keys,y,1)),rz=Math.max(.0003,sample(keys,y,2)),cz=sample(keys,y,3);
      for(let i=0;i<=N;i++){
        const u=i/N,t=u*Math.PI*2;let p=[Math.sin(t)*rx,y,Math.cos(t)*rz+cz];if(shapeFn)p=shapeFn(p,t,v);
        pos.push(...p);uv.push(u,v);
      }
    }
    const stride=N+1;
    for(let j=0;j<H;j++)for(let i=0;i<N;i++){const a=j*stride+i,b=a+1,c=a+stride,d=c+1;idx.push(a,b,c,b,d,c);}
    for(const j of [0,H]){
      const at=pos.length/3,y=j?y1:y0;pos.push(0,y,sample(keys,y,3));uv.push(.5,j?1:0);
      for(let i=0;i<N;i++){const a=j*stride+i,b=a+1;if(j)idx.push(at,a,b);else idx.push(at,b,a);}
    }
    return mesh(name,geometry(pos,idx,uv),mat,parent,centre);
  }
  const pantKeys=[[-.935,.224,.222,.0],[-.918,.233,.229,0],[-.872,.229,.223,.0],[-.72,.217,.215,-.002],[-.45,.210,.224,-.002],[-.17,.224,.239,0],[.071,.231,.241,0]];
  // Smooth shoe slices retain a round toe while tapering naturally to the heel.
  const shoeSections=[
    [.087,.224,.492,-.246],[.12,.246,.511,-.261],[.19,.247,.503,-.258],
    [.258,.229,.461,-.248],[.311,.198,.355,-.233],[.355,.163,.173,-.216],
    [.394,.133,.035,-.196],[.422,.088,-.012,-.170],[.435,.002,-.091,-.095]
  ];
  const shoeKeys=shoeSections.map(([y,x,f,b])=>[y,x,(f-b)/2,(f+b)/2]);
  function shoeY(x,z){
    let found=.09;
    for(let i=0;i<=180;i++){
      const y=mix(.087,.435,i/180),rx=Math.max(.0001,sample(shoeKeys,y,1)),rz=Math.max(.0001,sample(shoeKeys,y,2)),cz=sample(shoeKeys,y,3);
      if((x/rx)**2+((z-cz)/rz)**2<=1)found=y;
    }
    return found;
  }
  function leg(side){
    const id=side<0?'left':'right',l=group(`leg-${id}`,root,[side*.299,1.19,-.015]);
    closedLoft(`${id}-soft-tailored-trouser`,pantKeys,m.cloth,l,[0,0,0],40,22,(p,t,v)=>{
      const [x,y,z]=p,turn=Math.min(t,Math.PI*2-t),crease=.0075*Math.exp(-((turn/.20)**2))*Math.sin(Math.PI*clamp(v/.98));
      return [x+side*.018*(1-v),y,z+crease+.003*Math.sin((v-.07)*22)*Math.exp(-(((v-.10)/.13)**2))];
    });
    const hem=[];for(let i=0;i<=40;i++){const t=i/40*Math.PI*2;hem.push([Math.sin(t)*.231+side*.017,-.899,Math.cos(t)*.227+.001]);}
    tube(`${id}-trouser-hem-topstitch`,hem,.0014,m.seam,l,48);
    tube(`${id}-subtle-pressed-crease`,[-.84,-.65,-.4,-.13,.055].map(y=>[side*.018*(1-(y+.935)/1.006),y,sample(pantKeys,y,2)+.006]),.0011,m.lapel,l,30);
    const foot=group(`shoe-${id}`,l,[side*.024,-1.19,.034]);
    const soleKeys=[[.006,.227,.363,.119],[.014,.250,.388,.119],[.028,.255,.397,.119],[.070,.254,.396,.119],[.085,.248,.389,.119],[.094,.237,.378,.119]];
    closedLoft(`${id}-rounded-rubber-sole`,soleKeys,m.sole,foot,[0,0,0],48,9,(p,t)=>[p[0]*(.96+.055*Math.cos(t)),p[1],p[2]]);
    closedLoft(`${id}-sculpted-leather-upper`,shoeKeys,m.leather,foot,[0,0,0],44,24);
    const cap=[];for(let i=0;i<=16;i++){const x=mix(-.214,.214,i/16),z=.247+.039*(1-(x/.214)**2);cap.push([x,shoeY(x,z)+.004,z]);}
    tube(`${id}-derby-toe-cap-seam`,cap,.0021,m.sole,foot,40);
    for(const side2 of [-1,1]){
      const pts=[];for(let i=0;i<=8;i++){const t=i/8,x=side2*mix(.070,.17,t),z=mix(-.065,.177,t);pts.push([x,shoeY(x,z)+.005,z]);}
      tube(`${id}-vamp-edge-${side2}`,pts,.0024,m.sole,foot,24);
    }
    for(let k=0;k<3;k++){
      const z=-.016+k*.043;
      const pts=[[-.069,shoeY(-.069,z)+.008,z],[0,shoeY(0,z+.004)+.009,z+.004],[.069,shoeY(.069,z)+.008,z]];
      tube(`${id}-subtle-black-lace-${k}`,pts,.004,m.sole,foot,14);
    }
    return l;
  }
  const legLeft=leg(-1),legRight=leg(1);
  return {torso,tie,legLeft,legRight};
}
