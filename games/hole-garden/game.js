import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
const $=id=>document.getElementById(id),wrap=$('canvasWrap');
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
try{save=JSON.parse(localStorage.getItem('voidGardenSave')||'{}')}catch{}level=Math.max(1,save.level||1);mode=save.mode==='relaxed'?'relaxed':'timed';
// Dragging establishes a virtual joystick. Displacement from the initial touch controls velocity.
const drag={active:false,id:null,startX:0,startY:0,dx:0,dy:0};
// Simple sphere-bound rigid bodies: gravity, contact separation and stacking.
// Geometry is deliberately conservative so objects do not visibly intersect.
function makeItem(x,z,type,scale,color,stackHeight=0){
 const group=new THREE.Group();let mesh;
 const material=new THREE.MeshStandardMaterial({color,roughness:.38,metalness:.05});
 if(type==='bomb'){
  mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(.46*scale,1),new THREE.MeshStandardMaterial({color:0xf04764,roughness:.45}));
  const fuse=new THREE.Mesh(new THREE.CylinderGeometry(.06,.08,.3,8),new THREE.MeshStandardMaterial({color:0x333444}));fuse.position.y=.58*scale;group.add(fuse);
 }else{
  const shapes=[new THREE.BoxGeometry(.72*scale,.72*scale,.72*scale),new THREE.SphereGeometry(.45*scale,14,10),new THREE.CylinderGeometry(.37*scale,.43*scale,.8*scale,6),new THREE.DodecahedronGeometry(.47*scale)];
  mesh=new THREE.Mesh(shapes[Math.floor(Math.random()*shapes.length)],material);
 }
 const r=(type==='bomb'?.50:.53)*scale;
 mesh.position.y=0;mesh.castShadow=true;group.add(mesh);
 // Choose a legal initial horizontal position for floor objects, with several attempts.
 // Raised objects are positioned directly above their supporting item.
 if(stackHeight===0){
  for(let attempt=0;attempt<90;attempt++){
   const conflict=items.some(o=>!o.dead&&Math.hypot(o.group.position.x-x,o.group.position.z-z)<(o.r+r)*1.08);
   if(!conflict)break;
   const angle=Math.random()*Math.PI*2,dist=.25+Math.sqrt(attempt+1)*.30;
   x=THREE.MathUtils.clamp(x+Math.cos(angle)*dist,-WORLD+r,WORLD-r);
   z=THREE.MathUtils.clamp(z+Math.sin(angle)*dist,-WORLD+r,WORLD-r);
  }
 }
 const supporting=stackHeight>0?items.findLast(o=>o.type==='good'&&!o.dead&&Math.hypot(o.group.position.x-x,o.group.position.z-z)<.3):null;
 if(stackHeight>0&&!supporting){stackHeight=0}
 if(supporting){x=supporting.group.position.x;z=supporting.group.position.z}
 group.position.set(x,supporting?supporting.group.position.y+supporting.r+r+.02:r,z);
 scene.add(group);items.push({group,type,scale,r,vy:0,falling:false,fallTime:0,dead:false});
}
function resetLevel(){
 for(const item of items)scene.remove(item.group);items.length=0;
 collected=0;radius=.78;remaining=mode==='timed'?Math.max(100,150-Math.floor(level/3)*4):Infinity;
 hole.position.set(0,0,0);drag.active=false;drag.dx=drag.dy=0;
 // Starter objects near the origin, then larger groups around the world.
 for(let i=0;i<24;i++){const a=i*2.39996,r=2.2+Math.sqrt(i)*.7;makeItem(Math.cos(a)*r,Math.sin(a)*r,'good',.64+Math.random()*.38,palette[i%palette.length])}
 const clusters=11+Math.min(level,8);
 for(let c=0;c<clusters;c++){
  const cx=(Math.random()-.5)*39,cz=(Math.random()-.5)*39;
  const large=c%4===0,scale=large?1.9+Math.random()*1.5:.7+Math.random()*.75;
  const count=large?2+Math.floor(Math.random()*3):5+Math.floor(Math.random()*6);
  for(let i=0;i<count;i++){
   const x=THREE.MathUtils.clamp(cx+(Math.random()-.5)*(large?2.8:2.3),-WORLD+2,WORLD-2);
   const z=THREE.MathUtils.clamp(cz+(Math.random()-.5)*(large?2.8:2.3),-WORLD+2,WORLD-2);
   const stack=(!large&&i%4===0)?1:0;
   makeItem(x,z,'good',scale*(.85+Math.random()*.3),palette[(c+i)%palette.length],stack);
  }
 }
 for(let i=0;i<8+Math.min(level,8);i++){
  const x=(Math.random()-.5)*40,z=(Math.random()-.5)*40;
  if(Math.hypot(x,z)>5)makeItem(x,z,'bomb',.8,0xff4966);
 }
 goal=Math.min(35+level*4,items.filter(i=>i.type==='good').length-8);updateHud();
}
function physicsStep(dt){
 const active=items.filter(i=>!i.dead&&!i.falling);
 // A few solver iterations give stacks stable support without a physics dependency.
 const steps=Math.max(1,Math.ceil(dt/.016)),h=dt/steps;
 for(let step=0;step<steps;step++){
  for(const a of active){a.vy=Math.max(-16,a.vy-19*h);a.group.position.y+=a.vy*h}
  for(let iteration=0;iteration<4;iteration++){
   for(const a of active){
    if(a.group.position.y<a.r){a.group.position.y=a.r;if(a.vy<0)a.vy=0}
    a.group.position.x=THREE.MathUtils.clamp(a.group.position.x,-WORLD+a.r,WORLD-a.r);
    a.group.position.z=THREE.MathUtils.clamp(a.group.position.z,-WORLD+a.r,WORLD-a.r);
   }
   for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){
    const a=active[i],b=active[j];
    const dx=b.group.position.x-a.group.position.x,dy=b.group.position.y-a.group.position.y,dz=b.group.position.z-a.group.position.z;
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
function updateHud(){$('level').textContent=`Level ${level}`;$('modeBadge').textContent=mode.toUpperCase();$('timer').textContent=mode==='relaxed'?'∞':`${String(Math.floor(Math.max(0,remaining)/60)).padStart(2,'0')}:${String(Math.ceil(Math.max(0,remaining)%60)).padStart(2,'0')}`;$('goalText').textContent='Collect the goodies';$('progressText').textContent=`${collected} / ${goal}`;$('progressBar').style.width=`${Math.min(100,collected/goal*100)}%`;$('sizeText').textContent=`Hole size ${Math.round(radius/.78*10)/10}`}
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
 if(dist<Math.max(.05,radius-item.r*.35)&&item.r<radius*.76&&item.group.position.y<item.r+.32){
  item.falling=true;
  if(item.type==='bomb'){
   if(mode==='timed')remaining=Math.max(0,remaining-18);
   else collected=Math.max(0,collected-2);
   radius=Math.max(.78,radius-.12);
  }else{
   collected++;radius=Math.min(3.4,radius+.045);
   if(collected>=goal){win();break}
  }
 }
}
for(let i=items.length-1;i>=0;i--)if(items[i].dead)items.splice(i,1);updateHud()}}
// Camera follows the hole exactly, including at world boundaries.
camera.position.copy(hole.position).add(cameraOffset);cameraLook.copy(hole.position);camera.lookAt(cameraLook);
renderer.render(scene,camera)}requestAnimationFrame(tick);
$('playBtn').addEventListener('click',start);$('pauseBtn').addEventListener('click',()=>{if(state==='playing')showPanel('Paused','Your progress in this level is ready to restart.','Restart level')});document.querySelectorAll('.mode').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;document.querySelectorAll('.mode').forEach(x=>x.classList.toggle('selected',x===b));localStorage.setItem('voidGardenSave',JSON.stringify({level,mode}))}));document.querySelector(`.mode[data-mode="${mode}"]`).click();$('hint').textContent='Drag to steer • release to stop';updateHud();
