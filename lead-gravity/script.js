'use strict';
const G=6.67430e-11,gEarth=9.80665,rhoDefault=11340,aspect=1.5,targetForce=1e-6*gEarth;
const $=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d');
const controls={ball:$('ball'),pyramid:$('pyramid'),gap:$('gap'),density:$('density')};
const fmt=(x,n=5)=>Number(x).toLocaleString('en-US',{maximumSignificantDigits:n});
const sci=(x)=>x.toExponential(5);
function len(x){if(x<.001)return fmt(x*1e6)+' µm';if(x<1)return fmt(x*100)+' cm';if(x<1000)return fmt(x)+' m';return fmt(x/1000)+' km'}
function mass(x){if(x<.001)return fmt(x*1e6)+' mg';if(x<1)return fmt(x*1000)+' g';if(x<1000)return fmt(x)+' kg';return fmt(x/1000)+' t'}
function get(){const diam=10**Number(controls.ball.value),mp=Number(controls.pyramid.value),rho=Number(controls.density.value),gap=Number(controls.gap.value);if(!(mp>0&&mp<=1e9&&rho>0&&diam>0&&gap>=0))return null;const R=diam/2,ms=rho*Math.PI*diam**3/6,base=(3*mp/(rho*aspect))**(1/3),height=aspect*base;return{diam,mp,rho,gap,R,ms,base,height,comSphere:R,comPyramid:diam+gap+height/4,centerDistance:R+gap+height/4}}
// Numerical integration of the sphere's exact exterior field over a 3D square pyramid.
// y is measured upward from the sphere's bottom. The pyramid base is above the sphere.
function force(p){const nz=40,nxy=20;let integral=0;for(let k=0;k<nz;k++){const t=(k+.5)/nz,side=p.base*(1-t),z=p.R+p.gap+t*p.height;let layer=0;for(let i=0;i<nxy;i++){const x=((i+.5)/nxy-.5)*side;for(let j=0;j<nxy;j++){const y=((j+.5)/nxy-.5)*side;const r2=x*x+y*y+z*z;layer+=z/(r2*Math.sqrt(r2));}}integral+=layer*(side/nxy)**2*p.height/nz;}return G*p.ms*p.rho*integral}
function apply(p){controls.ball.value=Math.log10(p.diam);controls.pyramid.value=p.mp.toFixed(6);controls.gap.value=p.gap;controls.density.value=p.rho;update()}
function reset(){apply({diam:.1,mp:.152166,rho:rhoDefault,gap:.005})}
$('reset').onclick=reset;$('touch').onclick=()=>{controls.gap.value=0;update()};
$('target').onclick=()=>{let p=get();if(!p)return;const f=force({...p,gap:0});const scale=(targetForce/f)**.25;const diam=p.diam*scale,mp=p.mp*scale**3;if(diam>.999*1000||diam<.01||mp>1e9||mp<.0001){reset();p=get();const s=(targetForce/force({...p,gap:0}))**.25;apply({diam:p.diam*s,mp:p.mp*s**3,rho:p.rho,gap:0})}else apply({diam,mp,rho:p.rho,gap:0})};
for(const [key,input] of Object.entries(controls)){input.addEventListener('input',()=>{if(key==='pyramid'&&input.value.split('.')[1]?.length>6)return;update()});input.addEventListener('change',()=>{if(key==='pyramid'){let v=Math.min(1e9,Math.max(.000001,Number(input.value)||.152166));input.value=v.toFixed(6)}update()})}
let current=null;
function update(){const p=get();if(!p)return;current=p;const F=force(p),eq=F/gEarth,ratio=eq/1e-6;
$('ballOut').textContent=len(p.diam);$('gapOut').textContent=len(p.gap);$('densityOut').textContent=fmt(p.rho,6)+' kg/m³';$('forceOut').textContent=fmt(F*1e9,5)+' nN';$('forceN').textContent=sci(F)+' N';$('equivOut').textContent=fmt(eq*1e6,5)+' mg';$('comparison').textContent=fmt(ratio*100,5)+'% of claimed 0.001 g';$('weightOut').textContent=fmt(p.mp*gEarth,6)+' N';$('fraction').textContent=fmt(F/(p.mp*gEarth)*1e6,5)+' ppm of Earth weight';$('sphereMass').textContent=mass(p.ms)+' sphere';$('dimensions').textContent='Pyramid: '+mass(p.mp)+'; base '+len(p.base)+'; height '+len(p.height);
$('calculation').innerHTML=`<h3>1. Dimensions and masses</h3><p>We model the lower ball as a uniform sphere and the hanging object as a solid, square-based pyramid with its apex pointing upward. The height/base ratio is fixed at ${aspect}.</p><div class="equation">Sphere radius R = D/2 = ${fmt(p.diam,7)}/2 = ${fmt(p.R,7)} m\nSphere volume Vₛ = (4/3)πR³ = ${sci(4*Math.PI*p.R**3/3)} m³\nSphere mass Mₛ = ρVₛ = ${fmt(p.rho,7)} × ${sci(4*Math.PI*p.R**3/3)} = ${sci(p.ms)} kg\n\nPyramid volume Vₚ = Mₚ/ρ = ${sci(p.mp/p.rho)} m³\nVₚ = b²h/3, h = ${aspect}b\nBase width b = [3Mₚ/(${aspect}ρ)]^(1/3) = ${fmt(p.base,8)} m\nHeight h = ${aspect}b = ${fmt(p.height,8)} m</div><h3>2. Centers of mass and separation</h3><p>The sphere's center of mass is at its geometric center. A uniform pyramid's center of mass is one quarter of its height above its base. Both centers are marked in the drawing.</p><div class="equation">Sphere center above sphere bottom = R = ${fmt(p.R,8)} m\nPyramid center above its base = h/4 = ${fmt(p.height/4,8)} m\nSurface gap = ${fmt(p.gap,8)} m\nCenter-to-center distance d = R + gap + h/4\nd = ${fmt(p.R,8)} + ${fmt(p.gap,8)} + ${fmt(p.height/4,8)} = ${fmt(p.centerDistance,9)} m</div><h3>3. Gravitational attraction</h3><p>Because the lead ball is spherical, the shell theorem gives its exact external field as though its mass were concentrated at its center. The pyramid is not spherical, so we integrate the vertical component of this field over its volume. Horizontal components cancel by symmetry.</p><div class="equation">dF = G Mₛ ρ · z / (x² + y² + z²)^(3/2) dV\n\nF = G Mₛ ρ ∫[pyramid] z/(x²+y²+z²)^(3/2) dV\n\nG = ${G} m³ kg⁻¹ s⁻²\nMₛ = ${sci(p.ms)} kg\nρ = ${fmt(p.rho,7)} kg/m³\nNumerical integral I = ${sci(F/(G*p.ms*p.rho))} m\nF = G × Mₛ × ρ × I = ${sci(F)} N</div><p>The integral is approximated with 40 vertical slices and 20 × 20 midpoint samples per slice (16,000 elements). The center-to-center distance above is a useful geometric reference, but <strong>it is not substituted into the point-mass formula</strong> for the pyramid.</p><h3>4. Equivalent balance reading</h3><div class="equation">Δm = F / g₀, with g₀ = ${gEarth} m/s²\nΔm = ${sci(F)} / ${gEarth} = ${sci(eq)} kg\nΔm = ${sci(eq*1000)} g = ${sci(eq*1e6)} mg\n\nClaimed reading = 0.001 g = 1 mg\nFraction of claimed reading = ${fmt(ratio*100,6)}%\nClaim / prediction = ${fmt(targetForce/F,6)}×</div>`;
render(p)}
function render(p){
 const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(window.devicePixelRatio||1,2);
 canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const total=p.diam+p.gap+p.height,wide=Math.max(p.diam,p.base);
 const px=Math.min(h*.72/total,w*.48/wide),cx=w*.53,bottom=h*.90;
 const yy=z=>bottom-z*px;
 const circleY=yy(p.R),r=p.R*px,baseY=yy(p.diam+p.gap),tipY=yy(total),half=p.base*px/2,comPY=yy(p.comPyramid);
 const pink='#fb8ee7',mint='#81e6bd';
 // The sphere and pyramid share the same material color and geometric scale.
 ctx.fillStyle='#91a1b9';ctx.strokeStyle='#d2dbe8';ctx.lineWidth=1.5;
 ctx.beginPath();ctx.arc(cx,circleY,r,0,2*Math.PI);ctx.fill();ctx.stroke();
 ctx.beginPath();ctx.moveTo(cx,tipY);ctx.lineTo(cx+half,baseY);ctx.lineTo(cx-half,baseY);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.strokeStyle='#d2dbe877';ctx.beginPath();ctx.moveTo(cx,Math.max(0,tipY-22));ctx.lineTo(cx,tipY);ctx.stroke();
 function dot(y,label,massLabel){
   ctx.fillStyle=pink;ctx.strokeStyle='#241032';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,y,5,0,2*Math.PI);ctx.fill();ctx.stroke();
   ctx.font='12px system-ui';ctx.textAlign='left';ctx.fillStyle='#f8c4f1';
   // Labels follow the COM dots instead of being anchored to the left edge.
   let lx=cx+11;if(lx+105>w-8)lx=cx-110;
   const labelY=Math.max(15,Math.min(h-30,y-8));
   ctx.fillText(label,lx,labelY);ctx.fillStyle='#e7d9f3';ctx.font='11px system-ui';ctx.fillText('m = '+massLabel,lx,labelY+16);
 }
 dot(comPY,'Pyramid COM',fmt(p.mp,8)+' kg');dot(circleY,'Sphere COM',fmt(p.ms,8)+' kg');
 // Center-to-center measurement on the right.
 const dx=Math.min(w-118,cx+Math.max(r,half)+46);
 ctx.strokeStyle='#e0c3ff';ctx.fillStyle='#e0c3ff';ctx.lineWidth=1.4;
 ctx.beginPath();ctx.moveTo(dx,comPY);ctx.lineTo(dx,circleY);
 for(const y of [comPY,circleY]){ctx.moveTo(dx-6,y);ctx.lineTo(dx+6,y)}ctx.stroke();
 ctx.font='12px system-ui';ctx.textAlign='left';let labelY=(comPY+circleY)/2;
 ctx.fillText('COM distance',Math.min(dx+8,w-106),Math.max(18,labelY-5));
 ctx.fillText(len(p.centerDistance),Math.min(dx+8,w-106),Math.max(33,labelY+12));
 // Gap annotation directly beside the space between the surfaces.
 const gx=cx+Math.max(half,Math.min(r,24))+12,topSphere=yy(p.diam),gapMid=(baseY+topSphere)/2;
 ctx.strokeStyle='#80d9ee';ctx.fillStyle='#80d9ee';ctx.lineWidth=1.5;
 ctx.beginPath();ctx.moveTo(gx,baseY);ctx.lineTo(gx,topSphere);
 for(const y of [baseY,topSphere]){ctx.moveTo(gx-4,y);ctx.lineTo(gx+4,y)}ctx.stroke();
 ctx.font='11px system-ui';ctx.textAlign='left';
 ctx.fillText('gap '+len(p.gap),Math.min(gx+7,w-94),Math.max(15,Math.min(h-10,gapMid-7)));
 // A literal vertical banana ruler, not a drawing of a banana.
 const bx=35,by=h-45,scaleHeight=.18*px,top=by-scaleHeight;
 ctx.save();ctx.beginPath();ctx.rect(0,0,86,h);ctx.clip();
 ctx.strokeStyle=mint;ctx.fillStyle=mint;ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(bx,top);
 ctx.moveTo(bx-7,by);ctx.lineTo(bx+7,by);ctx.moveTo(bx-7,top);ctx.lineTo(bx+7,top);ctx.stroke();
 ctx.translate(bx+15,(by+top)/2);ctx.rotate(-Math.PI/2);ctx.textAlign='center';ctx.font='12px system-ui';ctx.fillText('Banana for scale · 18 cm',0,0);
 ctx.restore();
 // Prominent, solid, inward-pointing arrows: schematic force indicators.
 // Their position is reserved left of the objects and clear of the banana ruler.
 const ax=Math.max(135, cx-Math.max(r,half)-65);
 // Both arrowheads converge at the physical midpoint of the surface gap.
 const arrowTipY=(baseY+topSphere)/2;
 const available=Math.max(36,circleY-comPY);
 const arrowHeight=Math.max(45,Math.min(82,available*.36));
 const arrowWidth=Math.max(16,Math.min(27,w*.032));
 const arrowHead=Math.max(19,Math.min(31,arrowHeight*.42));
 function chunkyArrow(tipY, direction){
   const baseY=tipY-direction*arrowHeight;
   const shoulderY=tipY-direction*arrowHead;
   const shaftHalf=arrowWidth*.32,headHalf=arrowWidth*.82;
   ctx.save();ctx.fillStyle=pink;
   ctx.beginPath();
   ctx.moveTo(ax-shaftHalf,baseY);ctx.lineTo(ax+shaftHalf,baseY);
   ctx.lineTo(ax+shaftHalf,shoulderY);ctx.lineTo(ax+headHalf,shoulderY);
   ctx.lineTo(ax,tipY);ctx.lineTo(ax-headHalf,shoulderY);
   ctx.lineTo(ax-shaftHalf,shoulderY);ctx.closePath();ctx.fill();ctx.restore();
 }
 // Upper arrow points down; lower arrow points up.
 chunkyArrow(arrowTipY,1);
 chunkyArrow(arrowTipY,-1);
 const forceGrams=force(p)/gEarth*1000;
 // Fixed-point decimal, preserving meaningful small values without scientific notation.
 const fixedGrams=forceGrams.toFixed(Math.max(6,Math.min(16,Math.ceil(-Math.log10(Math.max(forceGrams,1e-16)))+3)));
 // Draw the result as an opaque overlay, AFTER the arrows, so it remains
 // readable even when large objects push the arrow into the heading area.
 const lines=['Gravitational','attraction',fixedGrams+' g'];
 ctx.save();ctx.textAlign='center';
 const titleFont='700 17px system-ui',valueFont='700 18px system-ui';
 ctx.font=titleFont;
 const titleWidth=Math.max(ctx.measureText(lines[0]).width,ctx.measureText(lines[1]).width);
 ctx.font=valueFont;
 const boxWidth=Math.max(146,Math.min(w-18,Math.max(titleWidth,ctx.measureText(lines[2]).width)+24));
 const boxHeight=81;
 const boxX=Math.max(9,Math.min(w-boxWidth-9,ax-boxWidth/2));
 // Prefer above the upper arrow, but always keep the whole label on canvas.
 const boxY=Math.max(9,Math.min(h-boxHeight-9,arrowTipY-arrowHeight-boxHeight-12));
 ctx.fillStyle='#100d21';ctx.strokeStyle=pink;ctx.lineWidth=1.8;
 ctx.beginPath();ctx.roundRect(boxX,boxY,boxWidth,boxHeight,10);ctx.fill();ctx.stroke();
 const centerX=boxX+boxWidth/2;
 ctx.fillStyle=pink;ctx.font=titleFont;
 ctx.fillText(lines[0],centerX,boxY+23);
 ctx.fillText(lines[1],centerX,boxY+43);
 ctx.font=valueFont;ctx.fillText(lines[2],centerX,boxY+67);
 ctx.restore();
 $('scaleNote').textContent='Same scale · 1 m = '+fmt(px,3)+' px';
}
window.addEventListener('resize',()=>{if(current)render(current)});reset();
