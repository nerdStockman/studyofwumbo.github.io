import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
const VERSION='0.7';
const $=id=>document.getElementById(id),wrap=$('canvasWrap');
$('version').textContent=`v${VERSION}`;
const scene=new THREE.Scene();scene.background=new THREE.Color('#303b60');
const camera=new THREE.OrthographicCamera(-5,5,7,-7,.1,120);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;wrap.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x6a6599,2.2));const sun=new THREE.DirectionalLight(0xffffff,2.4);sun.position.set(-8,18,12);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-35;sun.shadow.camera.right=35;sun.shadow.camera.top=35;sun.shadow.camera.bottom=-35;scene.add(sun);
const WORLD=23;
const floor=new THREE.Mesh(new THREE.PlaneGeometry(WORLD*2+3,WORLD*2+3),new THREE.MeshStandardMaterial({color:0x677d87,roughness:.96}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const grid=new THREE.GridHelper(WORLD*2,WORLD*2,0x8ca4a6,0x81989b);grid.position.y=.008;grid.material.transparent=true;grid.material.opacity=.16;scene.add(grid);
const hole=new THREE.Group();scene.add(hole);
const disk=new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.MeshBasicMaterial({color:0x080a18,depthWrite:false}));disk.rotation.x=-Math.PI/2;disk.position.y=.03;hole.add(disk);
const rim=new THREE.Mesh(new THREE.TorusGeometry(1,.105,12,64),new THREE.MeshStandardMaterial({color:0x83f5ce,emissive:0x217e70,emissiveIntensity:.35,metalness:.18,roughness:.28}));rim.rotation.x=-Math.PI/2;rim.position.y=.065;hole.add(rim);
const palette=[0xffc77b,0xf794ba,0x8de6d4,0xb9a1fa,0xf9ed91,0x90c8ff];const items=[];
let level=1,mode='timed',state='menu',remaining=90,goal=12,collected=0,radius=.8,last=0,save={};
let targets=[],totalGood=0;const SHAPES=['box','hex','sphere','gem'];const SHAPE_NAMES={box:'cubes',hex:'prisms',sphere:'balls',gem:'gems'};
try{save=JSON.parse(localStorage.getItem('voidGardenSave')||'{}')}catch{}level=Math.max(1,save.level||1);mode=save.mode==='relaxed'?'relaxed':'timed';
// Dragging establishes a virtual joystick. Displacement from the initial touch controls velocity.
const drag={active:false,id:null,startX:0,startY:0,dx:0,dy:0};
// Simple sphere-bound rigid bodies: gravity, contact separation and stacking.
// Geometry is deliberately conservative so objects do not visibly intersect.
function makeItem(x,z,type,scale,color,options={}){
 const shape=options.shape||(['box','sphere','hex','gem'][Math.floor(Math.random()*4)]);
 const group=new THREE.Group();let mesh;
 const material=new THREE.MeshStandardMaterial({color,roughness:.38,metalness:.05});
 if(type==='bomb'){
  mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(.46*scale,1),new THREE.MeshStandardMaterial({color:0xf04764,roughness:.45}));
  const fuse=new THREE.Mesh(new THREE.CylinderGeometry(.06,.08,.3,8),new THREE.MeshStandardMaterial({color:0x333444}));fuse.position.y=.58*scale;group.add(fuse);
 }else{
  const shapes={box:()=>new THREE.BoxGeometry(.72*scale,.72*scale,.72*scale),sphere:()=>new THREE.SphereGeometry(.45*scale,14,10),hex:()=>new THREE.CylinderGeometry(.4*scale,.4*scale,.72*scale,6),gem:()=>new THREE.DodecahedronGeometry(.47*scale)};
  mesh=new THREE.Mesh((shapes[shape]||shapes.box)(),material);
 }
 mesh.castShadow=true;group.add(mesh);
 // Flat-faced objects use their actual half-height for precise stacking.
 const flat=type==='good'&&(shape==='box'||shape==='hex');
 const halfHeight=flat?.36*scale:(type==='bomb'?.50:.53)*scale;
 const r=(type==='bomb'?.50:.53)*scale;
 const footprint=shape==='box'?.36*scale:shape==='hex'?.40*scale:r;
 const support=options.support||null;
 if(support){
  x=support.group.position.x;z=support.group.position.z;
 }else{
  for(let attempt=0;attempt<100;attempt++){
   const conflict=items.some(o=>!o.dead&&Math.hypot(o.group.position.x-x,o.group.position.z-z)<(o.footprint+footprint)*1.35);
   if(!conflict)break;
   const angle=Math.random()*Math.PI*2,dist=.28+Math.sqrt(attempt+1)*.38;
   x=THREE.MathUtils.clamp(x+Math.cos(angle)*dist,-WORLD+r,WORLD-r);
   z=THREE.MathUtils.clamp(z+Math.sin(angle)*dist,-WORLD+r,WORLD-r);
  }
 }
 group.position.set(x,support?support.group.position.y+support.halfHeight+halfHeight+.006:halfHeight,z);
 scene.add(group);
 const item={group,type,shape,colorIndex:options.colorIndex??0,flat,scale,r,footprint,halfHeight,vy:0,falling:false,fallTime:0,dead:false,stackId:options.stackId??null,anchorX:support?support.anchorX:x,anchorZ:support?support.anchorZ:z};
 items.push(item);return item;
}
let nextStackId=0;
function addPile(cx,cz,layers,colorIndex){
 // Every tier is an identical flat-faced object: same geometry, size and color.
 const shape=Math.random()<.65?'box':'hex';
 const scale=.68+Math.random()*.35;
 const stackId=++nextStackId;
 let support=null;
 for(let layer=0;layer<layers;layer++){
  support=makeItem(cx,cz,'good',scale,palette[colorIndex%palette.length],{shape,support,stackId,colorIndex});
 }
}
// Distinct neighborhoods of collectibles create short journeys between dense areas.
// Each neighborhood has several identical-object towers, ground scatter and a size tier.
function resetLevel(){
 for(const item of items)scene.remove(item.group);items.length=0;
 collected=0;radius=.78;remaining=mode==='timed'?Math.max(155,210-Math.floor(level/4)*5):Infinity;
 hole.position.set(0,0,0);drag.active=false;drag.dx=drag.dy=0;nextStackId=0;
 const clusters=[
  {x:-8,z:-7,tier:0},{x:8,z:-7,tier:0},
  {x:-9,z:7,tier:1},{x:9,z:8,tier:1},
  {x:-17,z:0,tier:2},{x:17,z:0,tier:2},
  {x:0,z:17,tier:3},{x:0,z:-17,tier:3}
 ];
 // Rotate the neighborhoods' visual identity per level, while retaining the
 // same approachable progression from small objects to large landmarks.
 const towerCenters=[];
 for(let c=0;c<clusters.length;c++){
  const area=clusters[c],colorIndex=(c+level)%palette.length;
  const towerCount=area.tier===0?5:area.tier===1?5:4;
  const baseScale=[.64,.86,1.12,1.48][area.tier];
  for(let j=0;j<towerCount;j++){
   const angle=2*Math.PI*j/towerCount+c*.47;
   const dist=1.15+(j%2)*1.3;
   const x=area.x+Math.cos(angle)*dist,z=area.z+Math.sin(angle)*dist;
   if(Math.hypot(x,z)<2.5)continue;
   const height=4+((j+c+level)%5)+(j===0?3:0);
   // A pile contains only same-shaped, same-sized, same-colored flat tiers.
   const shape=(c+j)%3===0?'hex':'box';
   const scale=baseScale*(.86+(j%3)*.08);
   const id=++nextStackId;let support=null;
   for(let k=0;k<height;k++)support=makeItem(x,z,'good',scale,palette[colorIndex],{shape,support,stackId:id,colorIndex});
   towerCenters.push({x,z});
  }
  // Ground scatter, concentrated in the same neighborhood. Non-flat objects
  // are never stacked or deliberately positioned on top of a tower.
  const looseCount=area.tier===0?24:area.tier===1?18:13;
  for(let j=0;j<looseCount;j++){
   const shape=SHAPES[(j+c)%4];
   const scale=baseScale*(.7+(j%6)*.12);
   let x,z,tries=0;
   do{
    const angle=Math.random()*Math.PI*2,dist=1.1+Math.sqrt(Math.random())*3.3;
    x=THREE.MathUtils.clamp(area.x+Math.cos(angle)*dist,-WORLD+1.5,WORLD-1.5);
    z=THREE.MathUtils.clamp(area.z+Math.sin(angle)*dist,-WORLD+1.5,WORLD-1.5);
    tries++;
   }while(tries<65&&(Math.hypot(x,z)<2.4||towerCenters.some(t=>Math.hypot(t.x-x,t.z-z)<1.55)));
   if(Math.hypot(x,z)<2.4||towerCenters.some(t=>Math.hypot(t.x-x,t.z-z)<1.3))continue;
   makeItem(x,z,'good',scale,palette[(colorIndex+j%3)%palette.length],{shape,colorIndex:(colorIndex+j%3)%palette.length});
  }
 }
 // A few giant landmark objects: unreachable early, rewarding after growth.
 for(const [x,z] of [[-18,-17],[18,-17],[-18,17],[18,17]]){
  makeItem(x,z,'good',2.7+Math.min(level,10)*.025,palette[(level+3)%palette.length],{shape:'box',colorIndex:(level+3)%palette.length});
 }
 // Bombs remain on the ground, mostly near medium/large neighborhoods.
 for(let j=0;j<11+Math.min(level,7);j++){
  const area=clusters[2+j%6];const angle=Math.random()*Math.PI*2;
  const x=THREE.MathUtils.clamp(area.x+Math.cos(angle)*4.6,-WORLD+1,WORLD-1);
  const z=THREE.MathUtils.clamp(area.z+Math.sin(angle)*4.6,-WORLD+1,WORLD-1);
  if(towerCenters.every(t=>Math.hypot(t.x-x,t.z-z)>1.3))makeItem(x,z,'bomb',.8,0xff4966);
 }
 // Select specific, abundant types from the small and medium neighborhoods.
 // Quotas are always below the actual generated count, so levels are winnable.
 const counts=new Map();
 for(const item of items){if(item.type!=='good')continue;const key=`${item.shape}:${item.colorIndex}`;counts.set(key,(counts.get(key)||0)+1)}
 const eligible=[...counts].filter(([key,n])=>n>=10).sort((a,b)=>b[1]-a[1]);
 const chosen=[];
 for(const entry of eligible){
  if(chosen.length>=2)break;
  if(chosen.length&&entry[0].split(':')[0]===chosen[0][0].split(':')[0])continue;
  chosen.push(entry);
 }
 if(chosen.length<2)chosen.push(...eligible.filter(e=>!chosen.includes(e)).slice(0,2-chosen.length));
 targets=chosen.map(([key,available],i)=>{const [shape,color]=key.split(':');return {key,shape,colorIndex:Number(color),needed:Math.min(available,Math.max(8,Math.floor(available*(i===0?.48:.38)))),count:0}});
 goal=targets.reduce((sum,t)=>sum+t.needed,0);totalGood=items.filter(i=>i.type==='good').length;
 updateHud();
}
function physicsStep(dt){
 const active=items.filter(i=>!i.dead&&!i.falling);
 // A few solver iterations give stacks stable support without a physics dependency.
 const steps=Math.max(1,Math.ceil(dt/.016)),h=dt/steps;
 for(let step=0;step<steps;step++){
  for(const a of active){a.vy=Math.max(-16,a.vy-19*h);a.group.position.y+=a.vy*h;if(a.stackId!==null){a.group.position.x=a.anchorX;a.group.position.z=a.anchorZ}}
  for(let iteration=0;iteration<3;iteration++){
   for(const a of active){
    if(a.group.position.y<a.halfHeight){a.group.position.y=a.halfHeight;if(a.vy<0)a.vy=0}
    a.group.position.x=THREE.MathUtils.clamp(a.group.position.x,-WORLD+a.r,WORLD-a.r);
    a.group.position.z=THREE.MathUtils.clamp(a.group.position.z,-WORLD+a.r,WORLD-a.r);
   }
   for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){
    const a=active[i],b=active[j];
    if((a.stackId!==null||b.stackId!==null)&&a.stackId!==b.stackId)continue;
    const dx=b.group.position.x-a.group.position.x,dy=b.group.position.y-a.group.position.y,dz=b.group.position.z-a.group.position.z;
    if(Math.abs(dx)>a.r+b.r+0.2||Math.abs(dz)>a.r+b.r+0.2||Math.abs(dy)>a.r+b.r+0.2)continue;
    // Upright flat shapes have a planar contact: this prevents the sphere-bound
    // approximation from repelling perfectly stacked cubes sideways.
    if(a.flat&&b.flat){
     // Tower tiers should stay vertically aligned until a lower tier is eaten.
     // This prevents the collision solver from dismantling generated stacks.
     if(a.stackId!==null&&a.stackId===b.stackId){
      const vertical=a.halfHeight+b.halfHeight-Math.abs(dy);
      if(vertical>0&&Math.abs(dx)<a.footprint+b.footprint&&Math.abs(dz)<a.footprint+b.footprint){
       const sign=dy>=0?1:-1;
       a.group.position.y-=sign*vertical*.5;
       b.group.position.y+=sign*vertical*.5;
       if(sign>0&&b.vy<0)b.vy=0;
       if(sign<0&&a.vy<0)a.vy=0;
      }
      continue;
     }
     const horizontalX=a.footprint+b.footprint-Math.abs(dx);
     const horizontalZ=a.footprint+b.footprint-Math.abs(dz);
     const vertical=a.halfHeight+b.halfHeight-Math.abs(dy);
     if(horizontalX>0&&horizontalZ>0&&vertical>0){
      if(vertical<=horizontalX&&vertical<=horizontalZ){
       const sign=dy>=0?1:-1;
       a.group.position.y-=sign*vertical*.5;
       b.group.position.y+=sign*vertical*.5;
       if(sign>0&&b.vy<0)b.vy=0;
       if(sign<0&&a.vy<0)a.vy=0;
      }else if(horizontalX<horizontalZ){
       const sign=dx>=0?1:-1;
       a.group.position.x-=sign*horizontalX*.5;b.group.position.x+=sign*horizontalX*.5;
      }else{
       const sign=dz>=0?1:-1;
       a.group.position.z-=sign*horizontalZ*.5;b.group.position.z+=sign*horizontalZ*.5;
      }
     }
     continue;
    }
    const minDist=a.r+b.r+.012,distSq=dx*dx+dy*dy+dz*dz;
    if(distSq>=minDist*minDist)continue;
    const dist=Math.sqrt(distSq),nx=dist>1e-5?dx/dist:0,ny=dist>1e-5?dy/dist:1,nz=dist>1e-5?dz/dist:0;
    const penetration=minDist-dist,move=penetration*.51;
    a.group.position.x-=nx*move;a.group.position.y-=ny*move;a.group.position.z-=nz*move;
    b.group.position.x+=nx*move;b.group.position.y+=ny*move;b.group.position.z+=nz*move;
    if(ny>.35&&b.vy<0)b.vy=0;
    if(ny<-.35&&a.vy<0)a.vy=0;
   }
  }
 }
}
function updateHud(){
 $('level').textContent=`Level ${level}`;$('modeBadge').textContent=mode.toUpperCase();
 $('timer').textContent=mode==='relaxed'?'∞':`${String(Math.floor(Math.max(0,remaining)/60)).padStart(2,'0')}:${String(Math.ceil(Math.max(0,remaining)%60)).padStart(2,'0')}`;
 $('goalText').textContent=targets.map(t=>`${t.count}/${t.needed} ${['gold','pink','mint','purple','yellow','blue'][t.colorIndex]} ${SHAPE_NAMES[t.shape]}`).join('  •  ')||'Collect the goodies';
 $('progressText').textContent=`${collected} / ${goal}`;
 $('progressBar').style.width=`${Math.min(100,collected/Math.max(1,goal)*100)}%`;
 $('sizeText').textContent=`Hole size ${Math.round(radius/.78*10)/10}`;
}
function showPanel(title,description,button){state='menu';drag.active=false;$('panelTitle').textContent=title;$('panelText').textContent=description;$('playBtn').textContent=button;$('overlay').classList.add('visible');$('modePicker').style.display=title==='Little Void Garden'?'flex':'none'}
function start(){if(state==='playing')return;state='playing';$('overlay').classList.remove('visible');resetLevel();last=performance.now()}
function win(){level++;save={level,mode};localStorage.setItem('voidGardenSave',JSON.stringify(save));showPanel('Level complete! ✨','All those goodies, gone! Your hole is ready for a new challenge.','Next level')}
function lose(reason){showPanel('Try again!',reason+' Give it another go — there are no lives to buy.','Retry level')}
function resize(){const w=wrap.clientWidth,h=wrap.clientHeight;renderer.setSize(w,h);const aspect=w/h;const halfH=6.4;camera.left=-halfH*aspect;camera.right=halfH*aspect;camera.top=halfH;camera.bottom=-halfH;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();
wrap.style.touchAction='none';
wrap.addEventListener('pointerdown',e=>{if(state!=='playing')return;e.preventDefault();drag.active=true;drag.id=e.pointerId;drag.startX=e.clientX;drag.startY=e.clientY;drag.dx=drag.dy=0;wrap.setPointerCapture(e.pointerId)});
wrap.addEventListener('pointermove',e=>{if(!drag.active||drag.id!==e.pointerId)return;e.preventDefault();drag.dx=e.clientX-drag.startX;drag.dy=e.clientY-drag.startY});
function stopDrag(e){if(e.pointerId!==drag.id)return;drag.active=false;drag.dx=drag.dy=0;drag.id=null}wrap.addEventListener('pointerup',stopDrag);wrap.addEventListener('pointercancel',stopDrag);wrap.addEventListener('lostpointercapture',stopDrag);
const cameraOffset=new THREE.Vector3(0,12,11);const cameraLook=new THREE.Vector3();
function tick(now){requestAnimationFrame(tick);const dt=Math.min((now-last)/1000||0,.05);last=now;if(state==='playing'){
if(mode==='timed'){remaining-=dt;if(remaining<=0){remaining=0;lose('Time ran out!')}}
if(state==='playing'){
if(drag.active){const length=Math.hypot(drag.dx,drag.dy);const strength=Math.min(1,length/85);if(length>8){const speed=(3.6+radius*.65)*strength;const nx=drag.dx/length,nz=drag.dy/length;
// screen vertical maps to world depth, compensated for tilted camera
hole.position.x=THREE.MathUtils.clamp(hole.position.x+nx*speed*dt,-WORLD,WORLD);hole.position.z=THREE.MathUtils.clamp(hole.position.z+nz*speed*dt,-WORLD,WORLD)}}
disk.scale.setScalar(radius);rim.scale.setScalar(radius);
physicsStep(dt);
for(const item of items){
 if(item.falling){
  item.fallTime+=dt;item.group.position.y-=dt*3.6;
  item.group.scale.multiplyScalar(Math.max(.01,1-dt*5));
  if(item.fallTime>.4){scene.remove(item.group);item.dead=true}
  continue;
 }
 const dist=Math.hypot(item.group.position.x-hole.position.x,item.group.position.z-hole.position.z);
 // Swallow objects whose centers are over the opening and which fit its diameter.
 // Elevated items fall naturally as their supporting bodies are removed.
 if(dist<radius*.72&&item.footprint<=radius*1.30&&item.group.position.y<item.halfHeight+.38){
  item.falling=true;
  if(item.type==='bomb'){
   if(mode==='timed')remaining=Math.max(0,remaining-18);
   else collected=Math.max(0,collected-2);
   radius=Math.max(.78,radius-.12);
  }else{
   const target=targets.find(t=>t.key===`${item.shape}:${item.colorIndex}`&&t.count<t.needed);
   if(target){target.count++;collected++}
   // All goodies contribute to growth, including non-target objects.
   radius=Math.min(3.8,radius+.017);
   if(goal>0&&collected>=goal){win();break}
  }
 }
}
for(let i=items.length-1;i>=0;i--)if(items[i].dead)items.splice(i,1);updateHud()}}
// Camera follows the hole exactly, including at world boundaries.
camera.position.copy(hole.position).add(cameraOffset);cameraLook.copy(hole.position);camera.lookAt(cameraLook);
renderer.render(scene,camera)}requestAnimationFrame(tick);
$('playBtn').addEventListener('click',start);$('pauseBtn').addEventListener('click',()=>{if(state==='playing')showPanel('Paused','Your progress in this level is ready to restart.','Restart level')});document.querySelectorAll('.mode').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;document.querySelectorAll('.mode').forEach(x=>x.classList.toggle('selected',x===b));localStorage.setItem('voidGardenSave',JSON.stringify({level,mode}))}));document.querySelector(`.mode[data-mode="${mode}"]`).click();$('hint').textContent='Drag to steer • release to stop';updateHud();
