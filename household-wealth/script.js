// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const canvas = $("wealthCanvas");
const ctx = canvas.getContext("2d");
const controlsCard = $("controlsCard");
const PLOT_FONT = "13px Inter, system-ui, Segoe UI, Roboto, Arial";

let mode = "tom";
let starMode = false;
let animFrame = null;
const totalHouseholds = 130_000_000;

// ---------- Colors ----------
const neonGradient10 = [
  "#41C9FF","#36A9FF","#3C6CFF","#4C45FF","#5D2EFF",
  "#741DFF","#8A13FF","#9B10FF","#C013FF","#E81CFF"
];
const neonGradient5 = [neonGradient10[0],neonGradient10[3],neonGradient10[5],neonGradient10[7],neonGradient10[9]];

// ---------- Groups ----------
const federalGroups = [
  {label:"0–50%",width:0.5,color:neonGradient5[0]},
  {label:"50–90%",width:0.4,color:neonGradient5[1]},
  {label:"90–99%",width:0.09,color:neonGradient5[2]},
  {label:"99–99.9%",width:0.009,color:neonGradient5[3]},
  {label:"Top 0.1%",width:0.001,color:neonGradient5[4]}
];
const tomGroups = Array.from({length:10},(_,i)=>{
  const lo=i*10,hi=(i+1)*10;
  const label=i===9?"Top 10%":`${lo}–${hi}%`;
  return {label,width:0.1,color:neonGradient10[i]};
});

// ---------- Star image ----------
const starImg = new Image();
starImg.src = "../star.png";

// ---------- Build Controls ----------
function buildControls(){
  if(animFrame){cancelAnimationFrame(animFrame);animFrame=null;}
  controlsCard.innerHTML="";
  const groups=mode==="federal"?federalGroups:tomGroups;

  const header=document.createElement("div");
  header.innerHTML=`<strong>Adjust wealth by group ($ / household)</strong>`;
  header.style.gridColumn="1 / -1";
  controlsCard.appendChild(header);

  const hdr=document.createElement("div");
  hdr.innerHTML=`
    <div class="color-box" style="visibility:hidden;"></div><div></div><div></div>
    <div class="muted col-header" style="text-align:center;"><div>$ Wealth Per Household</div></div>
    <div class="muted col-header"><div>Group’s</div><div><strong>Total</strong></div></div>
    <div class="muted col-header"><div>Group’s</div><div><strong>Share</strong></div></div>`;
  hdr.style.display="contents";
  controlsCard.appendChild(hdr);

  groups.slice().reverse().forEach((g,iRev)=>{
    const i=groups.length-1-iRev;
    const row=document.createElement("div");
    row.style.display="contents";
    row.innerHTML=`
      <span id="c${i+1}" class="color-box" style="background:${g.color};"></span>
      <label for="g${i+1}">${g.label}:</label>
      <input type="range" id="g${i+1}" min="0" max="200000000" step="1000" value="1230000">
      <input type="text" id="g${i+1}Box" value="1,230,000">
      <span id="g${i+1}Total" class="muted total-span"></span>
      <span id="g${i+1}Pct" class="muted pct-span"></span>`;
    controlsCard.appendChild(row);
  });

  const totals=document.createElement("div");
  totals.style.display="contents";
  totals.innerHTML=`
    <div class="color-box" style="visibility:hidden;"></div><div></div><div></div>
    <label class="total-label">Total:</label>
    <div id="sumTotal" class="muted total-span">0 T</div>
    <div id="sumPct" class="muted pct-span">100 %</div>`;
  controlsCard.appendChild(totals);

  const yr=document.createElement("div");
  yr.style.display="contents";
  yr.innerHTML=`
    <div class="color-box" style="visibility:hidden;"></div><div></div><div></div>
    <label>2025 Total:</label>
    <div id="fixedTotal" class="muted total-span">160.24 T</div><div></div>`;
  controlsCard.appendChild(yr);

  const btns=document.createElement("div");
  btns.style.gridColumn="1/-1";
  btns.style.textAlign="center";
  btns.style.marginTop="12px";
  btns.innerHTML=`
    <button id="normalizeBtn" class="pink-btn small-btn">Normalize to 2025 Total</button>
    <button id="actualBtn" class="pink-btn">Actual 2025 Distribution</button>`;
  controlsCard.appendChild(btns);

  if(mode==="tom"){
    const toggleRow=document.createElement("div");
    toggleRow.className="view-toggle-row";
    toggleRow.style.gridColumn="1/-1";
    toggleRow.innerHTML=`
      <label class="view-label">Bar View</label>
      <label class="switch">
        <input type="checkbox" id="viewToggle">
        <span class="slider"></span>
      </label>
      <label class="view-label">Star View</label>`;
    controlsCard.appendChild(toggleRow);
  }

  bindControls(groups);
}

// ---------- Helper ----------
function valToTotal(v,f){return v*totalHouseholds*f;}

// ---------- Bind Controls ----------
function bindControls(groups){
  const normalizeBtn=$("normalizeBtn");
  const actualBtn=$("actualBtn");
  const viewToggle=$("viewToggle");
  const sumTotal=$("sumTotal"), sumPct=$("sumPct");

  const getVals=()=>groups.map((_,i)=>Number($("g"+(i+1)).value));
  const setVals=(vs)=>vs.forEach((v,i)=>{
    $("g"+(i+1)).value=v;
    $("g"+(i+1)+"Box").value=Number(v).toLocaleString();
  });

  function enforceUp(i){const v=getVals();for(let j=i+1;j<v.length;j++)if(v[j]<v[j-1])v[j]=v[j-1];setVals(v);}
  function enforceDown(i){const v=getVals();for(let j=i-1;j>=0;j--)if(v[j]>v[j+1])v[j]=v[j+1];setVals(v);}
  function enforceAll(){const v=getVals();for(let i=1;i<v.length;i++)if(v[i]<v[i-1])v[i]=v[i-1];for(let i=v.length-2;i>=0;i--)if(v[i]>v[i+1])v[i]=v[i+1];setVals(v);}

  let lastVals=getVals();

  groups.forEach((g,i)=>{
    const s=$("g"+(i+1)),b=$("g"+(i+1)+"Box");
    s.addEventListener("input",()=>{
      b.value=Number(s.value).toLocaleString();
      const newVal=Number(s.value),oldVal=lastVals[i];
      if(newVal>oldVal)enforceUp(i);else if(newVal<oldVal)enforceDown(i);
      lastVals=getVals();draw(groups,getVals(),sumTotal,sumPct);
    });
    b.addEventListener("focus",()=>{b.value=s.value;setTimeout(()=>b.select(),0);});
    function commitBox(){
      let val=Number(b.value.replace(/,/g,""));
      if(isNaN(val))val=0;
      val=Math.min(200000000,Math.max(0,val));
      s.value=val;b.value=Number(val).toLocaleString();
      const oldVal=lastVals[i];
      if(val>oldVal)enforceUp(i);else if(val<oldVal)enforceDown(i);
      lastVals=getVals();draw(groups,getVals(),sumTotal,sumPct);
    }
    b.addEventListener("blur",commitBox);
    b.addEventListener("keydown",(e)=>{if(e.key==="Enter")b.blur();});
  });

  normalizeBtn.addEventListener("click",()=>{
    const vals=getVals();
    const totals=groups.map((g,i)=>valToTotal(vals[i],g.width));
    const sum=totals.reduce((a,b)=>a+b,0);
    if(sum<=0)return;
    const scale=160.23e12/sum;
    const newVals=vals.map(v=>v*scale);
    setVals(newVals);enforceAll();lastVals=getVals();draw(groups,getVals(),sumTotal,sumPct);
  });

  actualBtn.addEventListener("click",()=>{
    let preset;
    if(mode==="federal"){preset=[62462,934615,4990598,23179487,169769231];}
    else{preset=[12492,37477,62462,87446,112431,327346,732192,1137038,1541885,8275385];}
    setVals(preset);enforceAll();lastVals=getVals();draw(groups,getVals(),sumTotal,sumPct);
  });

  if(viewToggle){
    viewToggle.checked=starMode;
    viewToggle.addEventListener("change",()=>{
      starMode=viewToggle.checked;
      if(animFrame){cancelAnimationFrame(animFrame);animFrame=null;}
      draw(groups,getVals(),sumTotal,sumPct);
    });
  } else {starMode=false;if(animFrame){cancelAnimationFrame(animFrame);animFrame=null;}}

  enforceAll();lastVals=getVals();draw(groups,getVals(),sumTotal,sumPct);
}

// ---------- Axes ----------
function drawAxesAndLabels(M,plotX,plotY,plotW,plotH,maxVal){
  ctx.strokeStyle="rgba(255,255,255,0.1)";
  ctx.lineWidth=1;
  for(let i=0;i<=6;i++){
    const t=i/6,y=plotY+plotH-t*plotH;
    ctx.beginPath();ctx.moveTo(plotX,y);ctx.lineTo(plotX+plotW,y);ctx.stroke();
  }
  ctx.strokeStyle="#999";
  ctx.beginPath();ctx.moveTo(plotX,plotY);ctx.lineTo(plotX,plotY+plotH);ctx.stroke();
  ctx.beginPath();ctx.moveTo(plotX,plotY+plotH);ctx.lineTo(plotX+plotW,plotY+plotH);ctx.stroke();
  ctx.fillStyle="#fff";ctx.textAlign="right";ctx.font=PLOT_FONT;
  for(let i=0;i<=6;i++){
    const t=i/6,y=plotY+plotH-t*plotH;
    const val=(maxVal*t)/1e6;
    ctx.fillText(val.toPrecision(2)+" M",plotX-10,y+4);
  }
  ctx.textAlign="center";
  for(let p=0;p<=1.0001;p+=0.1){
    const x=plotX+p*plotW;
    ctx.beginPath();ctx.moveTo(x,plotY+plotH);ctx.lineTo(x,plotY+plotH+6);ctx.strokeStyle="#999";ctx.stroke();
    ctx.fillText((p*100).toFixed(0)+" %",x,plotY+plotH+20);
  }
  ctx.font="14px Inter, system-ui, Segoe UI, Roboto, Arial";
  ctx.fillText("Percentage of the Population",plotX+plotW/2,plotY+plotH+45);
  
  // y-axis label
ctx.save();
ctx.translate(plotX - 60, plotY + plotH / 2);
ctx.rotate(-Math.PI / 2);
ctx.textAlign = "center";
ctx.font = "14px Inter, system-ui, Segoe UI, Roboto, Arial";
ctx.fillStyle = "#fff";
ctx.fillText("$ Wealth Per Household", 0, 0);
ctx.restore();

}

// ---------- Draw ----------
function draw(groups,vals,sumTotal,sumPct){
  if(animFrame){cancelAnimationFrame(animFrame);animFrame=null;}
  const maxVal=Math.max(1,...vals)*1.1;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const M = { left:100, right:65, top:20, bottom:65 };
  const plotX=M.left,plotY=M.top;
  const plotW=canvas.width-(M.left+M.right);
  const plotH=canvas.height-(M.top+M.bottom);
  const totals=groups.map((g,i)=>valToTotal(vals[i],g.width));
  const totalWealth=totals.reduce((a,b)=>a+b,0);
  const denom=totalWealth||1;
  drawAxesAndLabels(M,plotX,plotY,plotW,plotH,maxVal);

  if(!starMode){
    let xCursor=plotX;
    groups.forEach((g,i)=>{
      const v=vals[i];
      const w=g.width*plotW,h=(v/maxVal)*plotH,y=plotY+plotH-h;
      g.xStart=xCursor;g.xEnd=xCursor+w;
      ctx.fillStyle=g.color;ctx.shadowColor=g.color;ctx.shadowBlur=14;
      ctx.fillRect(xCursor,y,w,h);
      ctx.shadowBlur=0;xCursor+=w;
    });
  } else {
    const cols=4,maxRows=25,rowSpacing=plotH/maxRows,starSize=rowSpacing*0.8,colGap=starSize*0.15;
    const startTime=performance.now();
    const drawStars=(time)=>{
      ctx.clearRect(0,0,canvas.width,canvas.height);
      drawAxesAndLabels(M,plotX,plotY,plotW,plotH,maxVal);
      const glow=Math.sin((time-startTime)/800)*0.5+0.5;
      let xCursor=plotX;
      groups.forEach((g,i)=>{
        const w=g.width*plotW;
        const n=Math.round((totals[i]/denom)*100);
        const fullRows=Math.floor(n/cols);
        const rem=n%cols;
        const rows=fullRows+(rem>0?1:0);
        const totalColsWidth=cols*starSize+(cols-1)*colGap;
        const leftX=xCursor+(w-totalColsWidth)/2;
        const baseY=plotY+plotH-starSize-5;
        for(let r=0;r<fullRows;r++){
          const y=baseY-r*rowSpacing;
          for(let c=0;c<cols;c++){
            const x=leftX+c*(starSize+colGap);
            ctx.shadowColor=`rgba(255,255,160,${0.5+0.5*glow})`;ctx.shadowBlur=8+4*glow;
            ctx.drawImage(starImg,x,y,starSize,starSize);
          }
        }
        if(rem>0){
          const yTop=baseY-fullRows*rowSpacing;
          for(let c=0;c<rem;c++){
            const x=leftX+c*(starSize+colGap);
            ctx.shadowColor=`rgba(255,255,160,${0.5+0.5*glow})`;ctx.shadowBlur=8+4*glow;
            ctx.drawImage(starImg,x,yTop,starSize,starSize);
          }
        }
        xCursor+=w;
      });
      animFrame=requestAnimationFrame(drawStars);
    };
    animFrame=requestAnimationFrame(drawStars);
  }

  groups.forEach((g,i)=>$("g"+(i+1)+"Total").textContent=(totals[i]/1e12).toFixed(2)+" T");
  groups.forEach((g,i)=>$("g"+(i+1)+"Pct").textContent=(totals[i]/denom*100).toFixed(1)+" %");
  sumTotal.textContent=(totalWealth/1e12).toFixed(2)+" T";
  sumPct.textContent="100 %";
}

// ---------- Mode Toggles ----------
$("federalBtn").addEventListener("click",()=>{mode="federal";starMode=false;if(animFrame){cancelAnimationFrame(animFrame);animFrame=null;}$("federalBtn").classList.add("active");$("tomBtn").classList.remove("active");buildControls();});
$("tomBtn").addEventListener("click",()=>{mode="tom";$("tomBtn").classList.add("active");$("federalBtn").classList.remove("active");buildControls();});

// ---------- Init ----------
buildControls();
