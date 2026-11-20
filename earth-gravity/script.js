'use strict';
const $=id=>document.getElementById(id), DEG=Math.PI/180;
const GE=9.7803253359,K=0.00193185265241,E2=0.00669437999013;
const grav=lat=>{const s=Math.sin(lat*DEG)**2;return GE*(1+K*s)/Math.sqrt(1-E2*s)};
const GP=grav(90);
// Approximate city-center coordinates, in alphabetical order.
const CITIES=[
  ['Anchorage',61.2181,-149.9003],
  ['Auckland',-36.8485,174.7633],
  ['Bangkok',13.7563,100.5018],
  ['Beijing',39.9042,116.4074],
  ['Berlin',52.52,13.405],
  ['Biloxi, MS',30.396,-88.8853],
  ['Bogotá',4.711,-74.0721],
  ['Buenos Aires',-34.6037,-58.3816],
  ['Cairo',30.0444,31.2357],
  ['Cape Town',-33.9249,18.4241],
  ['Chicago',41.8781,-87.6298],
  ['Delhi',28.6139,77.209],
  ['Denver',39.7392,-104.9903],
  ['Dubai',25.2048,55.2708],
  ['Honolulu',21.3099,-157.8581],
  ['Istanbul',41.0082,28.9784],
  ['Jakarta',-6.2088,106.8456],
  ['Johannesburg',-26.2041,28.0473],
  ['Karachi',24.8607,67.0011],
  ['Kinshasa',-4.4419,15.2663],
  ['Lagos',6.5244,3.3792],
  ['Lima',-12.0464,-77.0428],
  ['London',51.5074,-0.1278],
  ['Los Angeles',34.0522,-118.2437],
  ['Manaus',-3.119,-60.0217],
  ['Mexico City',19.4326,-99.1332],
  ['Miami, FL',25.7617,-80.1918],
  ['Moscow',55.7558,37.6173],
  ['Nairobi',-1.2921,36.8219],
  ['New York City',40.7128,-74.006],
  ['Novosibirsk',55.0084,82.9357],
  ['Oslo',59.9139,10.7522],
  ['Paris',48.8566,2.3522],
  ['Reykjavik',64.1466,-21.9426],
  ['Rio de Janeiro',-22.9068,-43.1729],
  ['Rome',41.9028,12.4964],
  ['Santa Fe',35.687,-105.9378],
  ['Santiago',-33.4489,-70.6693],
  ['Shanghai',31.2304,121.4737],
  ['Singapore',1.3521,103.8198],
  ['Sydney',-33.8688,151.2093],
  ['Tokyo',35.6762,139.6503],
  ['Toronto',43.6532,-79.3832],
  ['Ulaanbaatar',47.9184,106.9177],
  ['Vancouver',49.2827,-123.1207],
  ['Vladivostok',43.1155,131.8855],
  ['Yakutsk',62.0355,129.6755]
];
const citySelect=$('citySelect');
for(const [name] of CITIES){const opt=document.createElement('option');opt.value=name;opt.textContent=name;citySelect.appendChild(opt)}
citySelect.addEventListener('change',()=>{const city=CITIES.find(c=>c[0]===citySelect.value);if(city)setCoords(city[1],city[2]);});
let cityPins=[];
function syncCity(){const found=CITIES.find(c=>Math.abs(c[1]-lat)<.051&&Math.abs(c[2]-lon)<.051);citySelect.value=found?found[0]:''}
let lat=35.7,lon=-105.9,mass=1000,viewLon=lon,viewLat=18,drag=null;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function setCoords(a,b){lat=clamp(a,-90,90);lon=clamp(b,-180,180);$('lat').value=$('latNum').value=lat.toFixed(1);$('lon').value=$('lonNum').value=lon.toFixed(1);viewLon=lon;syncCity();render()}
for(const key of ['lat','lon']){const range=$(key),num=$(key+'Num');for(const el of [range,num])el.addEventListener('input',()=>{const n=Number(el.value);if(!Number.isFinite(n))return;setCoords(key==='lat'?n:lat,key==='lon'?n:lon)})}
$('mass').addEventListener('input',()=>{const n=Number($('mass').value);if(Number.isFinite(n)&&n>=0){mass=n;render()}});

function setup(canvas){const rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1,w=rect.width,h=rect.height;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);return {ctx,w,h}}
function spherePoint(phi,lambda){const p=phi*DEG,l=(lambda-viewLon)*DEG,v=viewLat*DEG;const x=Math.cos(p)*Math.sin(l),y=Math.sin(p)*Math.cos(v)-Math.cos(p)*Math.cos(l)*Math.sin(v),z=Math.sin(p)*Math.sin(v)+Math.cos(p)*Math.cos(l)*Math.cos(v);return {x,y,z}}
function drawGlobe(){cityPins=[];const {ctx:c,w,h}=setup($('globe'));const R=Math.min(h*.43,w*.34),cx=w/2,cy=h/2;c.clearRect(0,0,w,h);const fill=c.createRadialGradient(cx-R*.3,cy-R*.4,R*.1,cx,cy,R);fill.addColorStop(0,'#345d91');fill.addColorStop(.65,'#17345d');fill.addColorStop(1,'#08142a');c.beginPath();c.arc(cx,cy,R,0,2*Math.PI);c.fillStyle=fill;c.fill();c.strokeStyle='#6385c388';c.lineWidth=1.5;c.stroke();

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
function drawPlot(){const {ctx:c,w,h}=setup($('plot'));const left=75,right=22,top=22,bottom=48,pw=w-left-right,ph=h-top-bottom;const value=p=>mass*(grav(p)/GP-1);const low=value(0),high=0,span=Math.max(1e-10,high-low),pad=span*.12;const ymin=low-pad,ymax=high+pad;const X=p=>left+(p+90)/180*pw,Y=v=>top+(ymax-v)/(ymax-ymin)*ph;c.clearRect(0,0,w,h);c.font='12px system-ui';c.textAlign='right';for(let i=0;i<=4;i++){const v=ymin+(ymax-ymin)*i,y=Y(v);c.beginPath();c.moveTo(left,y);c.lineTo(w-right,y);c.strokeStyle='#ffffff18';c.stroke();c.fillStyle='#b9b3d0';c.fillText(v.toPrecision(3),left-9,y+4)}c.textAlign='center';for(let p=-90;p<=90;p+=30){const x=X(p);c.fillStyle='#b9b3d0';c.fillText(`${p}°`,x,h-bottom+22)}c.fillText('Geodetic latitude',left+pw/2,h-8);c.save();c.translate(15,top+ph/2);c.rotate(-Math.PI/2);c.fillText('Δ apparent weight (g)',0,0);c.restore();c.beginPath();for(let p=-90;p<=90;p++){const x=X(p),y=Y(value(p));p===-90?c.moveTo(x,y):c.lineTo(x,y)}c.strokeStyle='#b66dff';c.lineWidth=3;c.stroke();const x=X(lat),y=Y(value(lat));c.setLineDash([5,5]);c.strokeStyle='#facc1566';c.beginPath();c.moveTo(x,top);c.lineTo(x,h-bottom);c.stroke();c.setLineDash([]);c.beginPath();c.arc(x,y,5,0,Math.PI*2);c.fillStyle='#facc15';c.fill();c.strokeStyle='#fff';c.lineWidth=1;c.stroke()}
function render(){const g=grav(lat),d=mass*(g/GP-1),pole=mass;$('weight').textContent=(mass*g/GP).toFixed(6)+' g';$('delta').textContent=(d>=0?'+':'')+d.toFixed(6)+' g';$('deltaPct').textContent=((g/GP-1)*100).toFixed(4)+'% vs. North Pole · '+(pole===0?'0':Math.abs(d/pole*1e6).toFixed(0))+' ppm';$('gravity').textContent=g.toFixed(8)+' m/s²';drawGlobe();drawPlot()}
const globe=$('globe'),tip=$('cityTooltip');
function hitCity(e){const r=globe.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;let best=null,dist=Infinity;for(const pin of cityPins){const d=Math.hypot(x-pin.x,y-pin.y);if(d<dist){best=pin;dist=d}}return dist<=11?best:null}
function showTip(e){const pin=hitCity(e);if(!pin||drag?.moved){tip.style.display='none';globe.style.cursor='crosshair';return}const r=globe.getBoundingClientRect();tip.textContent=pin.name;tip.style.left=Math.min(e.clientX-r.left+14,r.width-120)+'px';tip.style.top=Math.max(4,e.clientY-r.top-36)+'px';tip.style.display='block';globe.style.cursor='pointer'}
globe.addEventListener('pointerleave',()=>{tip.style.display='none'});
globe.addEventListener('pointermove',showTip);
globe.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,lon:viewLon,lat:viewLat,moved:false};globe.setPointerCapture(e.pointerId)});globe.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>4)drag.moved=true;viewLon=drag.lon-dx*.45;viewLat=clamp(drag.lat+dy*.35,-90,90);drawGlobe()});globe.addEventListener('pointerup',e=>{if(!drag)return;if(!drag.moved){const city=hitCity(e);if(city){setCoords(city.lat,city.lon);drag=null;tip.style.display='none';return}const r=globe.getBoundingClientRect(),R=Math.min(r.height*.43,r.width*.34),x=(e.clientX-r.left-r.width/2)/R,y=-(e.clientY-r.top-r.height/2)/R;if(x*x+y*y<=1){const z=Math.sqrt(1-x*x-y*y),v=viewLat*DEG;const north=y*Math.cos(v)+z*Math.sin(v),forward=z*Math.cos(v)-y*Math.sin(v);setCoords(Math.asin(clamp(north,-1,1))/DEG,((viewLon+Math.atan2(x,forward)/DEG+540)%360)-180)}}drag=null});window.addEventListener('resize',render);syncCity();render();
