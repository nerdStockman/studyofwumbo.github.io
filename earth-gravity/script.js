'use strict';
const $=id=>document.getElementById(id), DEG=Math.PI/180;
const GE=9.7803253359,K=0.00193185265241,E2=0.00669437999013;
const grav=lat=>{const s=Math.sin(lat*DEG)**2;return GE*(1+K*s)/Math.sqrt(1-E2*s)};
const GP=grav(90);
// WGS84 normal gravity above the ellipsoid (second-order height expansion).
const A=6378137, F=1/298.257223563, M=0.00344978650684;
const gravAt=(phi,h)=>{const s=Math.sin(phi*DEG)**2;return grav(phi)*(1-2*h/A*(1+F+M-2*F*s)+3*h*h/(A*A))};
// Approximate city-center coordinates, in alphabetical order.
const CITIES=[
  ['Anchorage',61.2181,-149.9003,31],
  ['Auckland',-36.8485,174.7633,43],
  ['Bangkok',13.7563,100.5018,2],
  ['Beijing',39.9042,116.4074,44],
  ['Berlin',52.52,13.405,34],
  ['Biloxi, MS',30.396,-88.8853,6],
  ['Bogotá',4.711,-74.0721,2640],
  ['Buenos Aires',-34.6037,-58.3816,25],
  ['Cairo',30.0444,31.2357,23],
  ['Cape Town',-33.9249,18.4241,25],
  ['Chicago',41.8781,-87.6298,181],
  ['Delhi',28.6139,77.209,216],
  ['Denver',39.7392,-104.9903,1609],
  ['Dubai',25.2048,55.2708,16],
  ['Honolulu',21.3099,-157.8581,6],
  ['Istanbul',41.0082,28.9784,39],
  ['Jakarta',-6.2088,106.8456,8],
  ['Johannesburg',-26.2041,28.0473,1753],
  ['Karachi',24.8607,67.0011,8],
  ['Kinshasa',-4.4419,15.2663,240],
  ['Lagos',6.5244,3.3792,10],
  ['Lima',-12.0464,-77.0428,154],
  ['London',51.5074,-0.1278,11],
  ['Los Angeles',34.0522,-118.2437,71],
  ['Manaus',-3.119,-60.0217,92],
  ['Mexico City',19.4326,-99.1332,2240],
  ['Miami, FL',25.7617,-80.1918,2],
  ['Moscow',55.7558,37.6173,156],
  ['Nairobi',-1.2921,36.8219,1795],
  ['New York City',40.7128,-74.006,10],
  ['Novosibirsk',55.0084,82.9357,150],
  ['Oslo',59.9139,10.7522,23],
  ['Paris',48.8566,2.3522,35],
  ['Reykjavik',64.1466,-21.9426,15],
  ['Rio de Janeiro',-22.9068,-43.1729,5],
  ['Rome',41.9028,12.4964,21],
  ['Santa Fe',35.687,-105.9378,2134],
  ['Santiago',-33.4489,-70.6693,520],
  ['Shanghai',31.2304,121.4737,4],
  ['Singapore',1.3521,103.8198,15],
  ['Sydney',-33.8688,151.2093,58],
  ['Tokyo',35.6762,139.6503,40],
  ['Toronto',43.6532,-79.3832,76],
  ['Ulaanbaatar',47.9184,106.9177,1350],
  ['Vancouver',49.2827,-123.1207,2],
  ['Vladivostok',43.1155,131.8855,40],
  ['Yakutsk',62.0355,129.6755,95]
];
const citySelect=$('citySelect');
for(const [name] of CITIES){const opt=document.createElement('option');opt.value=name;opt.textContent=name;citySelect.appendChild(opt)}
citySelect.addEventListener('change',()=>{const city=CITIES.find(c=>c[0]===citySelect.value);if(city){setElevation(city[3],false);setCoords(city[1],city[2]);}});
let cityPins=[];
// A compatible regular grid must be supplied by the user. Never fabricate a gravity field.
let gravityGrid={lats:Array.from({length:181},(_,i)=>i-90),lons:Array.from({length:361},(_,i)=>i-180),values:Float32Array.from(BUNDLED_GRAVITY_GRID.values,v=>v*BUNDLED_GRAVITY_GRID.scale),min:Math.min(...BUNDLED_GRAVITY_GRID.values)*BUNDLED_GRAVITY_GRID.scale,max:Math.max(...BUNDLED_GRAVITY_GRID.values)*BUNDLED_GRAVITY_GRID.scale,filename:BUNDLED_GRAVITY_GRID.name};
const OMEGA=7.292115e-5;
const fmtSigned=v=>(v>=0?'+':'−')+Math.abs(v).toFixed(5)+' g';
const spinG=phi=>-OMEGA*OMEGA*A*Math.cos(phi*DEG)**2;
function contributions(phi,h,lambda){
 const spin=spinG(phi),shape=grav(phi)-GP-spin,alt=gravAt(phi,h)-grav(phi);
 const disturbance=gravityGrid?gridSample(phi,lambda):null;
 return {spin,shape,alt,local:disturbance===null?null:disturbance*1e-5};
}
function gridSample(phi,lambda){
 if(!gravityGrid)return null;
 const {lats,lons,values}=gravityGrid,latStep=lats[1]-lats[0],lonStep=lons[1]-lons[0];
 let lo=lambda;while(lo<lons[0])lo+=360;while(lo>lons.at(-1))lo-=360;
 const fy=(phi-lats[0])/latStep,fx=(lo-lons[0])/lonStep;
 if(fy<0||fy>lats.length-1||fx<0||fx>lons.length-1)return null;
 const y0=Math.min(lats.length-2,Math.floor(fy)),x0=Math.min(lons.length-2,Math.floor(fx));
 const ty=fy-y0,tx=fx-x0,cols=lons.length;
 const v=(y,x)=>values[y*cols+x];
 const z=[v(y0,x0),v(y0,x0+1),v(y0+1,x0),v(y0+1,x0+1)];
 if(z.some(t=>!Number.isFinite(t)))return null;
 return z[0]*(1-tx)*(1-ty)+z[1]*tx*(1-ty)+z[2]*(1-tx)*ty+z[3]*tx*ty;
}
function importGrid(text,filename){
 let points=[];
 if(filename.toLowerCase().endsWith('.json')){
   const obj=JSON.parse(text);
   if(obj.type!=='gravity_disturbance_mgal'||!Array.isArray(obj.points))throw Error('JSON must have type "gravity_disturbance_mgal" and points array');
   points=obj.points.map(p=>[Number(p.lat),Number(p.lon),Number(p.mgal)]);
 }else{
   const lines=text.trim().split(/\r?\n/).filter(t=>t.trim()&&!t.trim().startsWith('#'));
   const header=lines.shift().split(',').map(t=>t.trim().toLowerCase());
   const indices=['lat','lon','mgal'].map(t=>header.indexOf(t));
   if(indices.some(i=>i<0))throw Error('CSV header must contain lat,lon,mgal');
   points=lines.map(line=>{const parts=line.split(',');return indices.map(i=>Number(parts[i]))});
 }
 if(points.length<4||points.length>250000)throw Error('Grid must have 4–250,000 points');
 if(points.some(p=>p.some(v=>!Number.isFinite(v))||Math.abs(p[0])>90||Math.abs(p[1])>360||Math.abs(p[2])>10000))throw Error('Invalid coordinate or mGal value');
 const lats=[...new Set(points.map(p=>p[0]))].sort((a,b)=>a-b),lons=[...new Set(points.map(p=>p[1]))].sort((a,b)=>a-b);
 if(lats.length<2||lons.length<2||lats.length*lons.length!==points.length)throw Error('Data must form a complete rectangular grid');
 const uniform=a=>a.every((v,i)=>i===0||Math.abs((v-a[i-1])-(a[1]-a[0]))<1e-5);
 if(!uniform(lats)||!uniform(lons))throw Error('Latitude and longitude spacing must be uniform');
 const lookup=new Map(points.map(([p,l,v])=>[p+','+l,v]));
 const values=[];for(const p of lats)for(const l of lons){const v=lookup.get(p+','+l);if(v===undefined)throw Error('Missing grid point');values.push(v)}
 gravityGrid={lats,lons,values,min:Math.min(...values),max:Math.max(...values),filename};
}
$('gridStatus').textContent='EGM2008 · 1° global grid · 65,341 points (bundled)';$('heatToggle').disabled=false;$('clearGrid').disabled=false;
$('gridFile').addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{importGrid(await file.text(),file.name);$('gridStatus').textContent=`${file.name} · ${gravityGrid.values.length.toLocaleString()} points`; $('heatToggle').disabled=false;$('clearGrid').disabled=false;render()}
 catch(err){gravityGrid=null;$('gridStatus').textContent='Import failed: '+err.message;$('heatToggle').checked=false;$('heatToggle').disabled=true;$('clearGrid').disabled=true;render()}
});
$('clearGrid').addEventListener('click',()=>{gravityGrid=null;$('gridFile').value='';$('gridStatus').textContent='Local correction disabled';$('heatToggle').checked=false;$('heatToggle').disabled=true;$('clearGrid').disabled=true;render()});
$('heatToggle').addEventListener('change',render);

function syncCity(){const found=CITIES.find(c=>Math.abs(c[1]-lat)<.051&&Math.abs(c[2]-lon)<.051);citySelect.value=found?found[0]:''}
let lat=35.7,lon=-105.9,mass=100,elevation=2134,viewLon=lon,viewLat=18,drag=null;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function setCoords(a,b){lat=clamp(a,-90,90);lon=clamp(b,-180,180);$('lat').value=$('latNum').value=lat.toFixed(1);$('lon').value=$('lonNum').value=lon.toFixed(1);viewLon=lon;syncCity();render()}
for(const key of ['lat','lon']){const range=$(key),num=$(key+'Num');for(const el of [range,num])el.addEventListener('input',()=>{const n=Number(el.value);if(!Number.isFinite(n))return;setCoords(key==='lat'?n:lat,key==='lon'?n:lon)})}
function setElevation(v,shouldRender=true){elevation=clamp(v,-500,10000);$('elevation').value=clamp(elevation,-500,5000);$('elevationNum').value=elevation;if(shouldRender)render()}
for(const el of [$('elevation'),$('elevationNum')])el.addEventListener('input',()=>{const n=Number(el.value);if(Number.isFinite(n))setElevation(n)});
$('mass').addEventListener('input',()=>{const n=Number($('mass').value);if(Number.isFinite(n)&&n>=0){mass=n;render()}});

function setup(canvas){const rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1,w=rect.width,h=rect.height;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);return {ctx,w,h}}
function spherePoint(phi,lambda){const p=phi*DEG,l=(lambda-viewLon)*DEG,v=viewLat*DEG;const x=Math.cos(p)*Math.sin(l),y=Math.sin(p)*Math.cos(v)-Math.cos(p)*Math.cos(l)*Math.sin(v),z=Math.sin(p)*Math.sin(v)+Math.cos(p)*Math.cos(l)*Math.cos(v);return {x,y,z}}
function drawGlobe(){cityPins=[];const {ctx:c,w,h}=setup($('globe'));const R=Math.min(h*.43,w*.34),cx=w/2,cy=h/2;c.clearRect(0,0,w,h);const fill=c.createRadialGradient(cx-R*.3,cy-R*.4,R*.1,cx,cy,R);fill.addColorStop(0,'#345d91');fill.addColorStop(.65,'#17345d');fill.addColorStop(1,'#08142a');c.beginPath();c.arc(cx,cy,R,0,2*Math.PI);c.fillStyle=fill;c.fill();c.strokeStyle='#6385c388';c.lineWidth=1.5;c.stroke();

// Optional measured/modelled gravity-disturbance heatmap, only if an actual grid is loaded.
if(gravityGrid&&$('heatToggle').checked){
 const span=Math.max(Math.abs(gravityGrid.min),Math.abs(gravityGrid.max),1);
 c.save();c.beginPath();c.arc(cx,cy,R,0,Math.PI*2);c.clip();
 const step=5;
 for(let yy=cy-R;yy<cy+R;yy+=step)for(let xx=cx-R;xx<cx+R;xx+=step){
   const x=(xx+step/2-cx)/R,y=-(yy+step/2-cy)/R,rr=x*x+y*y;if(rr>=1)continue;
   const z=Math.sqrt(1-rr),v=viewLat*DEG,north=y*Math.cos(v)+z*Math.sin(v),forward=z*Math.cos(v)-y*Math.sin(v);
   const p=Math.asin(clamp(north,-1,1))/DEG,l=((viewLon+Math.atan2(x,forward)/DEG+540)%360)-180;
   const val=gridSample(p,l);if(val===null)continue;
   const strength=Math.min(1,Math.abs(val)/span),alpha=.12+.60*strength;
   c.fillStyle=val>=0?`rgba(255,121,180,${alpha})`:`rgba(75,207,242,${alpha})`;
   c.fillRect(xx,yy,step+1,step+1);
 }
 c.restore();
}
// Coastlines are projected onto the same rotating sphere as the city markers.
// Interpolate horizon crossings so the far side never appears through the globe.
function drawCoastlines(){
  c.save();c.beginPath();c.arc(cx,cy,R,0,2*Math.PI);c.clip();
  c.lineJoin='round';c.lineCap='round';
  for(const coastline of COASTLINES){
    let prev=null;const visible=[];
    for(const [p,l] of coastline){
      const q=spherePoint(p,l);
      if(prev){
        // Geographic segments that wrap around the antimeridian are not actual chords.
        if(Math.abs(l-prev.l)>180){prev={p,l,q};continue}
        let a=prev.q,b=q;
        if(a.z>=0||b.z>=0){
          if(a.z*b.z<0){
            // Linear interpolation in 3D, normalized to the visible limb.
            const t=a.z/(a.z-b.z),x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
            const norm=Math.hypot(x,y)||1;
            const edge={x:x/norm,y:y/norm};
            if(a.z>=0)visible.push([a,edge]);else visible.push([edge,b]);
          }else if(a.z>=0&&b.z>=0)visible.push([a,b]);
        }
      }
      prev={p,l,q};
    }
    c.beginPath();
    for(const [a,b] of visible){c.moveTo(cx+a.x*R,cy-a.y*R);c.lineTo(cx+b.x*R,cy-b.y*R)}
    c.strokeStyle='rgba(83,211,236,0.13)';c.lineWidth=3.6;c.stroke();
    c.strokeStyle='rgba(130,229,244,0.78)';c.lineWidth=1.05;c.stroke();
  }
  c.restore();
}
function curve(points,color,width=1){c.beginPath();let active=false;for(const [p,l] of points){const q=spherePoint(p,l);if(q.z>=0){const x=cx+q.x*R,y=cy-q.y*R;if(!active)c.moveTo(x,y);else c.lineTo(x,y);active=true}else active=false}c.strokeStyle=color;c.lineWidth=width;c.stroke()}
drawCoastlines();
for(let p=-75;p<=75;p+=15){const a=[];for(let l=-180;l<=180;l+=1)a.push([p,l]);curve(a,'#8cb6e02b')}
for(let l=-180;l<180;l+=15){const a=[];for(let p=-90;p<=90;p+=1)a.push([p,l]);curve(a,'#8cb6e02b')}
const equator=[];for(let l=-180;l<=180;l++)equator.push([0,l]);curve(equator,'#b66dff88',1.5);
function pin(p,l,color,label){const q=spherePoint(p,l);if(q.z<0)return;const x=cx+q.x*R,y=cy-q.y*R;c.beginPath();c.arc(x,y,6,0,Math.PI*2);c.fillStyle=color;c.shadowBlur=14;c.shadowColor=color;c.fill();c.shadowBlur=0;c.strokeStyle='#08091b';c.lineWidth=2;c.stroke();c.font='12px system-ui';c.fillStyle='#fff';c.fillText(label,x+12,y-10)}pin(90,0,'#7dd3fc','North Pole');for(const city of CITIES){const q=spherePoint(city[1],city[2]);if(q.z<=0)continue;const px=cx+q.x*R,py=cy-q.y*R;cityPins.push({name:city[0],lat:city[1],lon:city[2],x:px,y:py});c.beginPath();c.arc(px,py,3.5,0,2*Math.PI);c.fillStyle='#fa9edc';c.shadowColor='#fa9edc';c.shadowBlur=8;c.fill();c.shadowBlur=0;}
pin(lat,lon,'#facc15',`${lat.toFixed(1)}°, ${lon.toFixed(1)}°`);
c.fillStyle='#b9b3d0';c.font='12px system-ui';c.fillText('WGS84 reference Earth · schematic globe',14,h-15)}
function drawPlot(){const {ctx:c,w,h}=setup($('plot'));const left=75,right=22,top=22,bottom=48,pw=w-left-right,ph=h-top-bottom;const value=p=>mass*((gravAt(p,elevation)+(gravityGrid?(gridSample(p,lon)??0)*1e-5:0))/GP-1);const vals=[];for(let p=-90;p<=90;p+=2)vals.push(value(p));const low=Math.min(...vals),high=Math.max(...vals),span=Math.max(1e-8,high-low),pad=span*.12;const ymin=low-pad,ymax=high+pad;const X=p=>left+(p+90)/180*pw,Y=v=>top+(ymax-v)/(ymax-ymin)*ph;c.clearRect(0,0,w,h);c.font='12px system-ui';c.textAlign='right';for(let i=0;i<=4;i++){const v=ymin+(ymax-ymin)*i,y=Y(v);c.beginPath();c.moveTo(left,y);c.lineTo(w-right,y);c.strokeStyle='#ffffff18';c.stroke();c.fillStyle='#b9b3d0';c.fillText(v.toPrecision(3),left-9,y+4)}c.textAlign='center';for(let p=-90;p<=90;p+=30){const x=X(p);c.fillStyle='#b9b3d0';c.fillText(`${p}°`,x,h-bottom+22)}c.fillText('Geodetic latitude',left+pw/2,h-8);c.save();c.translate(15,top+ph/2);c.rotate(-Math.PI/2);c.fillText('Δ apparent weight (g)',0,0);c.restore();c.beginPath();for(let p=-90;p<=90;p++){const x=X(p),y=Y(value(p));p===-90?c.moveTo(x,y):c.lineTo(x,y)}c.strokeStyle='#b66dff';c.lineWidth=3;c.stroke();const x=X(lat),y=Y(value(lat));c.setLineDash([5,5]);c.strokeStyle='#facc1566';c.beginPath();c.moveTo(x,top);c.lineTo(x,h-bottom);c.stroke();c.setLineDash([]);c.beginPath();c.arc(x,y,5,0,Math.PI*2);c.fillStyle='#facc15';c.fill();c.strokeStyle='#fff';c.lineWidth=1;c.stroke()}
function makeBar(label,value,scale,sub,color){
 const width=Math.min(100,Math.abs(value)/Math.max(scale,1e-12)*100);
 return `<div class="factor-row"><div class="factor-label"><span>${label}</span><strong>${value===null?'No grid':fmtSigned(value)}</strong></div><div class="signed-track"><span class="zero-line"></span>${value===null?'':`<span class="signed-fill" style="${value<0?'right:50%':'left:50%'};width:${width/2}%;background:${color}"></span>`}</div><small>${sub}</small></div>`;
}
function render(){
 const parts=contributions(lat,elevation,lon),g0=gravAt(lat,elevation),corr=parts.local??0,g=g0+corr;
 const scale=mass/GP,reading=mass*g/GP,spin=scale*parts.spin,shape=scale*parts.shape,alt=scale*parts.alt,local=parts.local===null?null:scale*parts.local;
 $('weight').textContent=reading.toFixed(6)+' g';$('weightPct').textContent='('+(100*(g/GP-1)>=0?'+':'')+(100*(g/GP-1)).toFixed(5)+'%)';
 $('resultStatus').textContent=gravityGrid?(local===null?'WGS84 only at this point · outside loaded gravity grid':`WGS84 + ${gravityGrid.filename} · interpolated gravity disturbance`):'WGS84 normal gravity · local gravity not included (no grid loaded)';
 const bars=[['Earth’s rotation (centrifugal)',spin,'Reduced effective gravity away from the poles','#b66dff'],['Oblate Earth (shape)',shape,'Remaining latitude-dependent contribution','#7dd3fc'],['Elevation',alt,`${elevation.toLocaleString()} m above reference ellipsoid`,'#facc15'],['Local gravity disturbance',local,gravityGrid?'Interpolated from EGM2008 gravity disturbance grid':'Local correction disabled','#fa9edc']];
 const barScale=Math.max(...bars.map(b=>Math.abs(b[1]??0)),1e-10);
 $('factorBars').innerHTML=bars.map(b=>makeBar(b[0],b[1],barScale,b[2],b[3])).join('');
 const spinRange=[scale*spinG(0),0],shapeRange=[scale*(grav(0)-GP-spinG(0)),0];
 const altSamples=[];for(let p=-90;p<=90;p+=5)for(const h of [-500,10000])altSamples.push(scale*(gravAt(p,h)-grav(p)));
 const ranges=[['Rotation',spinRange,'Across all latitudes','#b66dff'],['Oblateness',shapeRange,'Across all latitudes','#7dd3fc'],['Elevation',[Math.min(...altSamples),Math.max(...altSamples)],'−500 to 10,000 m','#facc15']];
 if(gravityGrid)ranges.push(['Local gravity',[scale*gravityGrid.min*1e-5,scale*gravityGrid.max*1e-5],'Extrema of loaded grid','#fa9edc']);
 const extreme=Math.max(...ranges.flatMap(r=>r[1].map(Math.abs)),1e-10);
 $('rangeBars').innerHTML=ranges.map(([label,[min,max],note,color])=>{
 const left=50+min/extreme*48,right=50+max/extreme*48;
 return `<div class="range-row"><div class="range-head"><strong>${label}</strong><span>${fmtSigned(min)} to ${fmtSigned(max)}</span></div><div class="range-track"><span class="range-zero"></span><span class="range-fill" style="left:${left}%;width:${Math.max(1,right-left)}%;background:${color}"></span></div><small>${note}</small></div>`;
 }).join('');
 drawGlobe();drawPlot();
}
const globe=$('globe'),tip=$('cityTooltip');
function hitCity(e){const r=globe.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;let best=null,dist=Infinity;for(const pin of cityPins){const d=Math.hypot(x-pin.x,y-pin.y);if(d<dist){best=pin;dist=d}}return dist<=11?best:null}
function showTip(e){const pin=hitCity(e);if(!pin||drag?.moved){tip.style.display='none';globe.style.cursor='crosshair';return}const r=globe.getBoundingClientRect();tip.textContent=pin.name;tip.style.left=Math.min(e.clientX-r.left+14,r.width-120)+'px';tip.style.top=Math.max(4,e.clientY-r.top-36)+'px';tip.style.display='block';globe.style.cursor='pointer'}
globe.addEventListener('pointerleave',()=>{tip.style.display='none'});
globe.addEventListener('pointermove',showTip);
globe.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,lon:viewLon,lat:viewLat,moved:false};globe.setPointerCapture(e.pointerId)});globe.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>4)drag.moved=true;viewLon=drag.lon-dx*.45;viewLat=clamp(drag.lat+dy*.35,-90,90);drawGlobe()});globe.addEventListener('pointerup',e=>{if(!drag)return;if(!drag.moved){const city=hitCity(e);if(city){const selected=CITIES.find(c=>c[0]===city.name);if(selected)setElevation(selected[3],false);setCoords(city.lat,city.lon);drag=null;tip.style.display='none';return}const r=globe.getBoundingClientRect(),R=Math.min(r.height*.43,r.width*.34),x=(e.clientX-r.left-r.width/2)/R,y=-(e.clientY-r.top-r.height/2)/R;if(x*x+y*y<=1){const z=Math.sqrt(1-x*x-y*y),v=viewLat*DEG;const north=y*Math.cos(v)+z*Math.sin(v),forward=z*Math.cos(v)-y*Math.sin(v);setCoords(Math.asin(clamp(north,-1,1))/DEG,((viewLon+Math.atan2(x,forward)/DEG+540)%360)-180)}}drag=null});window.addEventListener('resize',render);syncCity();render();
